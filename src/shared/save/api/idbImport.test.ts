import { afterEach, describe, expect, it, vi } from 'vitest';
import { decode } from '../domain/codec';
import { defaultProfile } from '../domain/types';
import { importLegacyIdb } from './idbImport';
import { createMemoryStorage, createSaveMemoryApi } from './memory';
import { STORAGE_KEYS } from './localStorage';
import { fakeIdb } from '@/test/fakeIdb';

const legacySave = {
  settings: { lang: 'en', sound: false, vibration: false },
  seenQuestionIds: [5, 8, 13],
  guidelinesSeen: { flash: true, dilemma: false, ultime: false },
  soloBest: { flash: 6, dilemma: 0, ultime: 22 },
  gameSnapshot: { cursor: { phase: 'question' }, secretAnswers: { 't1|5': 'Kyoto' } },
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
const storedProfile = (api: ReturnType<typeof createSaveMemoryApi>) => {
  const decoded = decode('profile', api.raw('profile'));
  return decoded.kind === 'ok' ? decoded.data : decoded.kind;
};

describe('importLegacyIdb — move of the pre-refactor IndexedDB save', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies the profile keys into cb.profile (v1), drops the old game, then deletes the old DB', async () => {
    const { idb, calls, databases } = fakeIdb({ 'couple-battle': { save: { ...legacySave } } });
    const api = createSaveMemoryApi();
    expect(await importLegacyIdb(api, idb)).toEqual([]); // its old game has no savedAt: stale anyway
    expect(storedProfile(api)).toEqual({
      settings: { lang: 'en', sound: false, vibration: false },
      seenIds: [5, 8, 13],
      guidelinesSeen: { flash: true, dilemma: false, ultime: false },
      soloBest: { flash: 6, dilemma: 0, ultime: 22 },
    });
    expect(api.raw('game')).toBeNull(); // the old in-progress game (and its secrets) is not carried over
    await flush();
    expect(calls.deleted).toEqual(['couple-battle']);
    expect(databases).toEqual({});
    expect(calls.closed).toBe(1);
  });

  it('old values that are missing or corrupt start at their defaults, field by field', async () => {
    const { idb } = fakeIdb({ 'couple-battle': { save: { settings: { lang: 'de', sound: false }, seenQuestionIds: [3, 'x'] } } });
    const api = createSaveMemoryApi();
    await importLegacyIdb(api, idb);
    expect(storedProfile(api)).toEqual({ ...defaultProfile(), settings: { lang: 'fr', sound: false, vibration: true }, seenIds: [3] });
  });

  it('no old DB: nothing is written and no database gets created', async () => {
    const { idb, calls, databases } = fakeIdb({});
    const api = createSaveMemoryApi();
    await importLegacyIdb(api, idb);
    await flush();
    expect(api.raw('profile')).toBeNull();
    expect(databases).toEqual({});
    expect(calls.deleted).toEqual([]);
  });

  it('with a profile already saved, merges into it: seen ids ∪, bests and flags max, settings kept', async () => {
    const { idb, calls } = fakeIdb({ 'couple-battle': { save: { ...legacySave } } });
    const api = createSaveMemoryApi();
    const current = { ...defaultProfile(), seenIds: [8, 40], soloBest: { flash: 9, dilemma: 2, ultime: 0 } };
    api.write('profile', current);
    await importLegacyIdb(api, idb);
    expect(storedProfile(api)).toEqual({
      settings: current.settings,
      seenIds: [8, 40, 5, 13],
      guidelinesSeen: { flash: true, dilemma: false, ultime: false },
      soloBest: { flash: 9, dilemma: 2, ultime: 22 },
    });
    await flush();
    expect(calls.deleted).toEqual(['couple-battle']); // after the write
  });

  it('a launch that timed out (and then saved) is caught up by the next one: nothing lost', async () => {
    vi.useFakeTimers();
    const databases = { 'couple-battle': { save: { ...legacySave } } };
    const api = createSaveMemoryApi();
    const slow = importLegacyIdb(api, fakeIdb(databases, { hang: true }).idb);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await slow).toEqual([]);
    api.write('profile', { ...defaultProfile(), seenIds: [77] }); // the session went on and saved
    vi.useRealTimers();
    const { idb, calls } = fakeIdb(databases);
    await importLegacyIdb(api, idb);
    expect(storedProfile(api)).toMatchObject({ seenIds: [77, 5, 8, 13], soloBest: { ultime: 22 } });
    await flush();
    expect(calls.deleted).toEqual(['couple-battle']);
  });

  it('a fresh old game cannot resume: reported so Home says so; a stale one is dropped quietly', async () => {
    const at = (savedAt: number) => fakeIdb({ 'couple-battle': { save: { ...legacySave, gameSnapshot: { cursor: {}, savedAt } } } }).idb;
    expect(await importLegacyIdb(createSaveMemoryApi(), at(Date.now() - 60_000))).toEqual(['gameDiscarded']);
    expect(await importLegacyIdb(createSaveMemoryApi(), at(Date.now() - 13 * 3600_000))).toEqual([]);
  });

  it('an unreadable current profile is left to load() (backup first): nothing written, old DB kept', async () => {
    const { idb, calls } = fakeIdb({ 'couple-battle': { save: { ...legacySave } } });
    const storage = createMemoryStorage({ [STORAGE_KEYS.profile]: 'garbage' });
    await importLegacyIdb(createSaveMemoryApi(storage), idb);
    await flush();
    expect(storage.getItem(STORAGE_KEYS.profile)).toBe('garbage');
    expect(calls.deleted).toEqual([]);
  });

  it('a failing open is skipped: no throw, nothing written, the old DB kept', async () => {
    const { idb, databases } = fakeIdb({ 'couple-battle': { save: { ...legacySave } } }, { failOpen: true });
    const api = createSaveMemoryApi();
    await expect(importLegacyIdb(api, idb)).resolves.toEqual([]);
    expect(api.raw('profile')).toBeNull();
    expect(Object.keys(databases)).toEqual(['couple-battle']);
  });

  it('when cb.profile cannot be written, the old DB is kept for the next launch', async () => {
    const { idb, calls } = fakeIdb({ 'couple-battle': { save: { ...legacySave } } });
    const storage = createMemoryStorage();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await expect(importLegacyIdb(createSaveMemoryApi(storage), idb)).resolves.toEqual([]);
    await flush();
    expect(calls.deleted).toEqual([]);
  });

  it('a blocked delete (another tab holds the old DB) does not hold the boot', async () => {
    const { idb } = fakeIdb({ 'couple-battle': { save: { ...legacySave } } }, { blockDelete: true });
    const api = createSaveMemoryApi();
    await importLegacyIdb(api, idb);
    expect(storedProfile(api)).toMatchObject({ seenIds: [5, 8, 13] });
  });

  it('an IndexedDB that never answers is given up on after 3 s', async () => {
    vi.useFakeTimers();
    const { idb } = fakeIdb({ 'couple-battle': { save: { ...legacySave } } }, { hang: true });
    const api = createSaveMemoryApi();
    const done = importLegacyIdb(api, idb);
    await vi.advanceTimersByTimeAsync(3000);
    await expect(done).resolves.toEqual([]);
    expect(api.raw('profile')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no IndexedDB at all (old browser, test env) is a no-op', async () => {
    await expect(importLegacyIdb(createSaveMemoryApi(), undefined)).resolves.toEqual([]);
  });

  it('the storage keys it writes are the new ones', () => {
    expect(STORAGE_KEYS).toEqual({ profile: 'cb.profile', game: 'cb.game' });
  });
});
