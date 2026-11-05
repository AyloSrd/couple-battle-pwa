import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoundWebAudioApi } from './webAudio';

describe('createSoundWebAudioApi without an AudioContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('play/music are no-ops instead of throwing when no AudioContext exists', () => {
    // jsdom doesn't implement WebAudio, but stub explicitly so this test holds
    // even if that ever changes.
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);

    const api = createSoundWebAudioApi();

    expect(() => api.play('sfx.tap')).not.toThrow();
    expect(() => api.music('mus.final')).not.toThrow();
    expect(() => api.music(null)).not.toThrow();
  });
});

// ---- fake WebAudio ------------------------------------------------------------------------

class FakeParam {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime() {}
  linearRampToValueAtTime() {}
  cancelScheduledValues() {}
}

class FakeNode {
  connected: unknown[] = [];
  connect<T>(to: T): T {
    this.connected.push(to);
    return to;
  }
  disconnect() {}
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  loop = false;
  started = 0;
  stopped = 0;
  onended: (() => void) | null = null;
  start() {
    this.started++;
  }
  stop() {
    this.stopped++;
  }
}

type TDecoded = { id: string };

class FakeContext {
  static last: FakeContext;
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  /** Buffer sources playing a decoded music buffer (SFX noise sources carry no `id`). */
  sources: FakeSource[] = [];
  decodes = 0;
  constructor() {
    FakeContext.last = this;
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    return Object.assign(new FakeNode(), {
      type: 'square',
      frequency: new FakeParam(),
      start() {},
      stop() {},
    });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: '', frequency: new FakeParam() });
  }
  createBuffer(_ch: number, len: number) {
    return { getChannelData: () => new Float32Array(len) };
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  decodeAudioData(data: ArrayBuffer): Promise<TDecoded> {
    this.decodes++;
    return Promise.resolve({ id: new TextDecoder().decode(data) });
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  /** Sources fed with a decoded music file (as opposed to SFX noise buffers). */
  musicSources(id?: string) {
    return this.sources.filter((s) => {
      const b = s.buffer as Partial<TDecoded> | null;
      return b?.id !== undefined && (id === undefined || b.id === id);
    });
  }
}

type TDeferred = { url: string; resolve: () => void; reject: () => void };

/** fetch stub: each call stays pending until the test resolves it. The body is the file name. */
function stubFetch() {
  const calls: TDeferred[] = [];
  const fn = vi.fn((url: string) => {
    return new Promise<Response>((res, rej) => {
      const name = /audio\/(\w+)\.m4a$/.exec(url)?.[1] ?? 'unknown';
      calls.push({
        url,
        resolve: () =>
          res({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(name).buffer) } as Response),
        reject: () => rej(new Error('offline')),
      });
    });
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

function at<T>(arr: T[], i = 0): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`missing item ${i}`);
  return v;
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

async function settle(calls: TDeferred[], name: string) {
  calls.filter((c) => c.url.includes(`/${name}.m4a`)).forEach((c) => c.resolve());
  await flush();
}

describe('music (pre-rendered files)', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeContext);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches under the Vite base only after the first gesture, and starts a gapless loop once decoded', async () => {
    const { fn, calls } = stubFetch();
    const api = createSoundWebAudioApi();
    expect(fn).not.toHaveBeenCalled(); // nothing before unlock/play

    api.music('mus.menu');
    expect(fn).toHaveBeenCalled();
    expect(fn.mock.calls.map((c) => c[0])).toContain(`${import.meta.env.BASE_URL}audio/menu.m4a`);
    const ctx = FakeContext.last;
    expect(ctx.musicSources()).toHaveLength(0); // not decoded yet: nothing plays

    await settle(calls, 'menu');
    const playing = ctx.musicSources('menu');
    expect(playing).toHaveLength(1);
    expect(at(playing).loop).toBe(true);
    expect(at(playing).started).toBe(1);
  });

  it('plays straight away from the cache the second time', async () => {
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    api.music('mus.menu');
    await settle(calls, 'menu');
    api.music(null);
    const ctx = FakeContext.last;
    api.music('mus.menu');
    expect(ctx.musicSources('menu')).toHaveLength(2); // restarted synchronously, no new decode
    expect(ctx.decodes).toBe(1);
  });

  it('a late decode does not start when another music() call superseded it', async () => {
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    api.music('mus.menu');
    api.music('mus.final');
    const ctx = FakeContext.last;

    await settle(calls, 'final');
    expect(ctx.musicSources('final')).toHaveLength(1);
    await settle(calls, 'menu'); // stale: menu was replaced by final
    expect(ctx.musicSources('menu')).toHaveLength(0);
    expect(ctx.musicSources()).toHaveLength(1);
  });

  it('music(null) before the decode cancels the pending start', async () => {
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    api.music('mus.menu');
    api.music(null);
    await settle(calls, 'menu');
    expect(FakeContext.last.musicSources()).toHaveLength(0);
  });

  it('switching stops the previous loop (no double playback) and asking for the same loop twice is a no-op', async () => {
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    api.music('mus.menu');
    await settle(calls, 'menu');
    api.music('mus.menu');
    const ctx = FakeContext.last;
    expect(ctx.musicSources('menu')).toHaveLength(1);

    api.music('mus.final');
    await settle(calls, 'final');
    const menu = at(ctx.musicSources('menu'));
    expect(menu.stopped).toBe(1);
    const final = at(ctx.musicSources('final'));
    expect(final.stopped).toBe(0);
    expect(final.loop).toBe(true);
  });

  it('disabling sound stops the music, and nothing restarts while disabled', async () => {
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    api.music('mus.menu');
    await settle(calls, 'menu');
    const ctx = FakeContext.last;
    api.setEnabled(false);
    expect(at(ctx.musicSources('menu')).stopped).toBe(1);

    api.music('mus.final'); // refused while disabled
    await settle(calls, 'final');
    expect(ctx.musicSources('final')).toHaveLength(0);
  });

  it('disabling during the decode keeps the music from starting later', async () => {
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    api.music('mus.menu');
    api.setEnabled(false);
    await settle(calls, 'menu');
    expect(FakeContext.last.musicSources()).toHaveLength(0);
  });

  it('duck() lowers the music bus and restores it, without touching the master volume', () => {
    stubFetch();
    const api = createSoundWebAudioApi();
    api.unlock();
    const ctx = FakeContext.last;
    const master = at(ctx.gains, 0);
    const bus = at(ctx.gains, 1);
    expect(bus.gain.value).toBe(0.3);
    api.duck(true);
    expect(bus.gain.value).toBe(0.09);
    api.duck(false);
    expect(bus.gain.value).toBe(0.3);
    expect(master.gain.value).toBe(0.55);
  });

  it('mus.round: skipped while not decoded, then plays once on the music bus without stopping the loop', async () => {
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    api.music('mus.menu');
    await settle(calls, 'menu');
    const ctx = FakeContext.last;

    api.play('mus.round'); // round not decoded yet -> skipped
    expect(ctx.musicSources('round')).toHaveLength(0);
    await settle(calls, 'round');
    api.play('mus.round');

    const round = at(ctx.musicSources('round'));
    expect(round.loop).toBe(false);
    expect(round.started).toBe(1);
    const bus = at(ctx.gains, 1);
    expect(round.connected).toContain(bus);
    const menu = at(ctx.musicSources('menu'));
    expect(menu.stopped).toBe(0); // the loop keeps running
  });

  it('stays silent, never throws and warns only once when fetch fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { calls } = stubFetch();
    const api = createSoundWebAudioApi();
    expect(() => api.music('mus.menu')).not.toThrow();
    calls.forEach((c) => c.reject());
    await flush();
    expect(FakeContext.last.musicSources()).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(() => api.play('mus.round')).not.toThrow();
    expect(() => api.music(null)).not.toThrow();
  });

  it('stays silent when the response is not ok', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404 } as Response)));
    const api = createSoundWebAudioApi();
    api.music('mus.final');
    await flush();
    expect(FakeContext.last.musicSources()).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
