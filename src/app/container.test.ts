import { describe, expect, it, vi } from 'vitest';
import { createContainer } from './container';

const idbMocks = vi.hoisted(() => ({
  openSaveDb: vi.fn(() => Promise.reject(new Error('indexedDB unavailable'))),
  createSaveIdbApi: vi.fn(),
}));
const soundMocks = vi.hoisted(() => ({
  createSoundWebAudioApi: vi.fn(() => ({
    unlock: vi.fn(),
    setEnabled: vi.fn(),
    setVolume: vi.fn(),
    duck: vi.fn(),
    play: vi.fn(),
    music: vi.fn(),
  })),
}));
const wakeLockMocks = vi.hoisted(() => ({
  createWakeLockBrowserApi: vi.fn(() => ({
    request: vi.fn(() => Promise.resolve()),
    release: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock('@/shared/save/api/idb', () => idbMocks);
vi.mock('@/shared/sound/api/webAudio', () => soundMocks);
vi.mock('@/shared/wakeLock/api/browser', () => wakeLockMocks);

describe('createContainer("memory")', () => {
  it('builds all four ports with no real backends', async () => {
    const c = await createContainer('memory');
    expect(c.questionsApi).toBeDefined();
    expect(c.saveApi).toBeDefined();
    expect(c.soundApi).toBeDefined();
    expect(c.wakeLockApi).toBeDefined();
  });

  it('serves the real JSON catalog (catalog is always JSON)', async () => {
    const c = await createContainer('memory');
    const all = await c.questionsApi.list({ lang: 'fr' });
    expect(all.length).toBe(1035);
    const whoOfTwo = await c.questionsApi.list({ lang: 'fr', types: ['who_of_two'] });
    expect(whoOfTwo.length).toBeGreaterThan(0);
    expect(whoOfTwo.every((q) => q.type === 'who_of_two')).toBe(true);
  });

  it('returns save defaults and the sound/wake-lock twins are inert', async () => {
    const c = await createContainer('memory');
    await expect(c.saveApi.get('settings')).resolves.toEqual({ lang: 'fr', sound: true });
    expect(() => c.soundApi.play('sfx.tap')).not.toThrow();
    await expect(c.wakeLockApi.request()).resolves.toBeUndefined();
    await expect(c.wakeLockApi.release()).resolves.toBeUndefined();
  });
});

describe('createContainer() (persistent) when openSaveDb fails', () => {
  it('falls back to the in-memory save but keeps the real WebAudio and wake-lock adapters', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const c = await createContainer();

    expect(idbMocks.openSaveDb).toHaveBeenCalled();
    expect(idbMocks.createSaveIdbApi).not.toHaveBeenCalled();
    expect(soundMocks.createSoundWebAudioApi).toHaveBeenCalled();
    expect(wakeLockMocks.createWakeLockBrowserApi).toHaveBeenCalled();
    await expect(c.saveApi.get('settings')).resolves.toEqual({ lang: 'fr', sound: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
