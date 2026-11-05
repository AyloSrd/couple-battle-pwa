import { hapticFor } from '../domain/haptics';
import type { TMusicId, TPlayOpts, TSoundId } from '../domain/types';
import type { TSoundApi } from './index';

/**
 * Couple Battle sound engine. SFX are synthesized (ported from handoff/lib/sounds.js,
 * frequencies and envelopes byte-for-byte: do not retune here). Music is three pre-rendered
 * files (public/audio/*.m4a), decoded lazily after the first gesture into a music bus.
 */

// Resolved against the Vite `base` (the app lives under a sub-path).
const MUSIC_FILES = {
  'mus.menu': 'audio/menu.m4a',
  'mus.final': 'audio/final.m4a',
  'mus.round': 'audio/round.m4a',
} as const;
type TMusicFileId = keyof typeof MUSIC_FILES;

const MASTER_LEVEL = 0.55;
const MUSIC_LEVEL = 0.3; // music bus gain
const MUSIC_LEVEL_DUCKED = 0.09; // while the pause sheet is open
const FADE_OUT_S = 0.2; // stop / switch fade

const S = 0.0001; // exp ramp floor

type TToneOpts = { freq?: number; type?: OscillatorType; t?: number; dur?: number; vol?: number; slideTo?: number | null };
type TNoiseOpts = { t?: number; dur?: number; vol?: number; hp?: number; lpFrom?: number | null; lpTo?: number | null };

class Engine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = true;
  haptics = false;
  musicBus: GainNode | null = null;
  ducked = false;
  /** The loop last asked for (null = none): decides whether a late decode may still start. */
  wanted: TMusicId | null = null;
  loop: { id: TMusicId; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  stingers = new Set<AudioBufferSourceNode>();
  buffers = new Map<TMusicFileId, AudioBuffer>();
  loading = new Map<TMusicFileId, Promise<AudioBuffer | null>>();
  warned = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return; // no WebAudio support — stay silent instead of throwing
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_LEVEL;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.ducked ? MUSIC_LEVEL_DUCKED : MUSIC_LEVEL;
      this.musicBus.connect(this.master);
      // A running context keeps the audio thread (and battery) busy even while silent: suspend it
      // while hidden. A resume refused without a gesture is retried by the next tap's `unlock()`.
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.visibilityState === 'hidden') this.ctx.suspend().catch(() => {});
        else if (this.enabled) this.ctx.resume().catch(() => {});
      });
    }
    // 'interrupted' is iOS Safari's state after a call or screen lock.
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    // First gesture: warm the decoded buffers (served from the SW precache after the first visit).
    if (this.enabled) for (const id of Object.keys(MUSIC_FILES) as TMusicFileId[]) void this.load(id);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      this.music(null);
      this.stopStingers();
    }
    if (this.master) this.master.gain.value = on ? MASTER_LEVEL : 0;
  }

  setHaptics(on: boolean) {
    this.haptics = on;
  }

  buzz(id: TSoundId) {
    const pattern = hapticFor(id, this.haptics);
    if (pattern !== null) navigator.vibrate?.(pattern);
  }

  duck(on: boolean) {
    this.ducked = on;
    if (this.musicBus) this.musicBus.gain.value = on ? MUSIC_LEVEL_DUCKED : MUSIC_LEVEL;
  }

  tone({ freq = 440, type = 'square', t = 0, dur = 0.08, vol = 0.5, slideTo = null }: TToneOpts) {
    const c = this.ctx!, now = c.currentTime + t;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(S, now + dur);
    o.connect(g).connect(this.master!);
    o.start(now);
    o.stop(now + dur + 0.02);
    return o;
  }

  noise({ t = 0, dur = 0.1, vol = 0.4, hp = 800, lpFrom = null, lpTo = null }: TNoiseOpts) {
    const c = this.ctx!, now = c.currentTime + t;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    if (lpFrom) {
      f.type = 'lowpass';
      f.frequency.setValueAtTime(lpFrom, now);
      f.frequency.exponentialRampToValueAtTime(lpTo || lpFrom, now + dur);
    } else {
      f.type = 'highpass';
      f.frequency.value = hp;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(S, now + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(now);
  }

  chord(freqs: number[], { t = 0, dur = 0.25, type = 'square', vol = 0.25 }: TToneOpts = {}) {
    freqs.forEach((f) => this.tone({ freq: f, type, t, dur, vol }));
  }

  play(id: TSoundId, opt: TPlayOpts = {}) {
    this.buzz(id);
    this.synth(id, opt);
  }

  synth(id: TSoundId, opt: TPlayOpts = {}) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx) return; // no AudioContext available — nothing to play
    const fx: Record<string, () => void> = {
      'sfx.tap':       () => this.tone({ freq: 880, dur: 0.05, vol: 0.3 }),
      'sfx.back':      () => this.tone({ freq: 440, dur: 0.06, vol: 0.3 }),
      'sfx.error':     () => { this.tone({ freq: 330, dur: 0.09 }); this.tone({ freq: 220, t: 0.1, dur: 0.14 }); },
      'sfx.whoosh':    () => this.noise({ dur: 0.12, vol: 0.25, lpFrom: 400, lpTo: 4000 }),
      'sfx.select':    () => { this.tone({ freq: 660, dur: 0.06 }); this.tone({ freq: 990, t: 0.07, dur: 0.09 }); },
      'sfx.toggle.on': () => { this.tone({ freq: 523, dur: 0.05 }); this.tone({ freq: 784, t: 0.06, dur: 0.07 }); },
      'sfx.toggle.off':() => { this.tone({ freq: 784, dur: 0.05 }); this.tone({ freq: 523, t: 0.06, dur: 0.07 }); },
      'sfx.lock':      () => { this.tone({ freq: 1567, dur: 0.03, vol: 0.35 }); this.noise({ t: 0.02, dur: 0.04, vol: 0.3, hp: 3000 }); },
      'sfx.pass':      () => { this.noise({ dur: 0.09, vol: 0.22, lpFrom: 500, lpTo: 3000 }); this.noise({ t: 0.12, dur: 0.09, vol: 0.22, lpFrom: 3000, lpTo: 500 }); },
      'sfx.reveal':    () => { this.tone({ freq: 200, dur: 0.22, slideTo: 1200, vol: 0.3 }); this.tone({ freq: 1568, t: 0.24, dur: 0.1, type: 'triangle', vol: 0.4 }); },
      'sfx.point.exact': () => { [523, 659, 784].forEach((f, i) => this.tone({ freq: f, t: i * 0.07, dur: 0.09 })); },
      'sfx.point.close': () => { [523, 659].forEach((f, i) => this.tone({ freq: f, t: i * 0.08, dur: 0.1 })); },
      'sfx.point.miss':  () => { this.tone({ freq: 311, dur: 0.14 }); this.tone({ freq: 233, t: 0.15, dur: 0.22 }); },
      'sfx.countdown.tick': () => {
        const step = opt.step ?? 3; // 3, 2, 1
        const f = ({ 3: 660, 2: 784, 1: 988 } as Record<number, number>)[step] || 660;
        this.tone({ freq: f, type: 'triangle', dur: 0.07, vol: 0.6 });
      },
      'sfx.countdown.go': () => {
        this.chord([523, 659, 784, 1046], { dur: 0.35, vol: 0.22 });
        this.noise({ dur: 0.2, vol: 0.3, hp: 1500 });
      },
      'sfx.score.tally': () => this.tone({ freq: 1046 + Math.random() * 200, type: 'triangle', dur: 0.04, vol: 0.35 }),
      'sfx.synchro':   () => { [659, 784, 988, 1318].forEach((f, i) => this.tone({ freq: f, t: i * 0.06, dur: 0.09, type: 'triangle', vol: 0.45 })); },
      'sfx.mismatch':  () => { [415, 349, 277].forEach((f, i) => this.tone({ freq: f, t: i * 0.14, dur: 0.18 })); },
      'sfx.confetti':  () => { for (let i = 0; i < 6; i++) this.noise({ t: i * 0.05 + Math.random() * 0.02, dur: 0.05, vol: 0.2, hp: 2000 + Math.random() * 3000 }); },
      'mus.round':     () => this.stinger(),
      'mus.fanfare':   () => {
        const seq: [number, number, number][] = [[523, 0, .12], [523, .14, .12], [523, .28, .12], [659, .42, .3], [523, .76, .12], [659, .9, .5]];
        seq.forEach(([f, t, d]) => { this.tone({ freq: f, t, dur: d, vol: 0.35 }); this.tone({ freq: f / 2, t, dur: d, type: 'triangle', vol: 0.3 }); });
        this.synth('sfx.confetti');
      },
    };
    (fx[id] || (() => console.warn('unknown sound', id)))();
  }

  /** Fetch + decode a music file once; failures are logged once and stay silent (retried on the next ask). */
  load(id: TMusicFileId): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(id);
    if (cached) return Promise.resolve(cached);
    const pending = this.loading.get(id);
    if (pending) return pending;
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    const p = (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}${MUSIC_FILES[id]}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(id, buf);
        return buf;
      } catch (err) {
        if (!this.warned) {
          this.warned = true;
          console.warn('music unavailable, staying silent', id, err);
        }
        return null;
      } finally {
        this.loading.delete(id);
      }
    })();
    this.loading.set(id, p);
    return p;
  }

  /** One-shot round stinger on the music bus. Does not touch the loop. Skipped if not decoded yet. */
  stinger() {
    const buf = this.buffers.get('mus.round');
    if (!buf) {
      void this.load('mus.round'); // ready for next time
      return;
    }
    if (!this.ctx || !this.musicBus) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.musicBus);
    src.onended = () => this.stingers.delete(src);
    this.stingers.add(src);
    src.start();
  }

  stopStingers() {
    for (const src of this.stingers) {
      try {
        src.stop();
      } catch {
        // already stopped — ignore.
      }
    }
    this.stingers.clear();
  }

  /** Fade the current loop out and release it. */
  stopLoop() {
    const cur = this.loop;
    if (!cur) return;
    this.loop = null;
    const now = this.ctx!.currentTime;
    try {
      cur.gain.gain.cancelScheduledValues(now);
      cur.gain.gain.setValueAtTime(cur.gain.gain.value, now);
      cur.gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_S);
      cur.src.stop(now + FADE_OUT_S);
    } catch {
      // already stopped — ignore.
    }
    cur.src.onended = () => {
      cur.src.disconnect();
      cur.gain.disconnect();
    };
  }

  startLoop(id: TMusicId, buf: AudioBuffer) {
    if (!this.ctx || !this.musicBus) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.loop = true; // the files are sample-exact seamless loops
    src.connect(gain).connect(this.musicBus);
    src.start();
    this.loop = { id, src, gain };
  }

  music(id: TMusicId | null) {
    if (id !== null && id === this.wanted && this.enabled) return; // already playing / loading it
    this.wanted = id;
    if (this.ctx) this.stopLoop();
    if (!id || !this.enabled) {
      this.wanted = null;
      return;
    }
    this.unlock();
    if (!this.ctx) return; // no AudioContext available — nothing to play
    const ready = this.buffers.get(id);
    if (ready) {
      this.startLoop(id, ready);
      return;
    }
    void this.load(id).then((buf) => {
      // Superseded (another music() call, or sound disabled) while decoding: stay silent.
      if (!buf || this.wanted !== id || !this.enabled || this.loop) return;
      this.startLoop(id, buf);
    });
  }
}

export function createSoundWebAudioApi(): TSoundApi {
  const engine = new Engine();
  return {
    setEnabled: (on) => engine.setEnabled(on),
    setHaptics: (on) => engine.setHaptics(on),
    duck: (on) => engine.duck(on),
    play: (id, opt) => engine.play(id, opt),
    music: (id) => engine.music(id),
  };
}
