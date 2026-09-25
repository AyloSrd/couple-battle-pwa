import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IDBPDatabase } from 'idb';
import { createSaveIdbApi } from './idb';
import { SAVE_DEFAULTS, type TGameSnapshot } from '../domain/types';

/** Just enough of IDBPDatabase for the adapter: one store, key → value. */
function fakeDb(seed: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(seed));
  const db = {
    get: async (_s: string, key: string) => store.get(key),
    put: async (_s: string, value: unknown, key: string) => {
      store.set(key, value);
      return key;
    },
    delete: async (_s: string, key: string) => {
      store.delete(key);
    },
  } as unknown as IDBPDatabase;
  return { db, store };
}

const NOW = Date.UTC(2026, 8, 25, 20, 0, 0);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const validSnapshot: TGameSnapshot = {
  roster: [{ teamId: 't1', avatarId: 'otters', players: ['A', 'B'] }],
  mode: 'dilemma',
  difficulty: 'mix',
  themes: [],
  deck: [],
  cursor: { phase: 'question', round: 0, coupleIdx: 0, questionIdx: 0 },
  scores: { t1: 0 },
  secretAnswers: {},
  confirmed: {},
  savedAt: NOW - MINUTE,
};

describe('createSaveIdbApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the key default when nothing was ever written', async () => {
    const api = createSaveIdbApi(fakeDb().db);
    expect(await api.get('gameSnapshot')).toBeNull();
    expect(await api.get('settings')).toEqual(SAVE_DEFAULTS.settings);
  });

  it('returns a stored value that fits its schema', async () => {
    const api = createSaveIdbApi(fakeDb({ gameSnapshot: validSnapshot }).db);
    expect(await api.get('gameSnapshot')).toEqual(validSnapshot);
  });

  it('a stale save with a retired team degrades to "no game" and is dropped — never throws', async () => {
    const stale = { ...validSnapshot, roster: [{ teamId: 't1', avatarId: 'frogs', players: ['A', 'B'] }] };
    const { db, store } = fakeDb({ gameSnapshot: stale });
    const api = createSaveIdbApi(db);

    await expect(api.get('gameSnapshot')).resolves.toBeNull();
    expect(store.has('gameSnapshot')).toBe(false); // self-healed
    // and a second read is the plain "never written" path
    expect(await api.get('gameSnapshot')).toBeNull();
  });

  it('corrupt values for other keys fall back to their defaults too', async () => {
    const { db, store } = fakeDb({ settings: { lang: 'klingon', sound: 'loud' }, soloBest: 'nope' });
    const api = createSaveIdbApi(db);
    expect(await api.get('settings')).toEqual(SAVE_DEFAULTS.settings);
    expect(await api.get('soloBest')).toEqual(SAVE_DEFAULTS.soloBest);
    expect(store.size).toBe(0);
  });

  it('put still validates before storing (a retired team is rejected on the way in)', async () => {
    const { db, store } = fakeDb();
    const api = createSaveIdbApi(db);
    const bad = { ...validSnapshot, roster: [{ teamId: 't1', avatarId: 'cocktails', players: ['A', 'B'] }] };
    await expect(api.put('gameSnapshot', bad as unknown as TGameSnapshot)).rejects.toThrow();
    expect(store.has('gameSnapshot')).toBe(false);
    await api.put('gameSnapshot', validSnapshot);
    expect(store.get('gameSnapshot')).toEqual(validSnapshot);
  });

  describe('gameSnapshot resume window', () => {
    const { savedAt: _omit, ...withoutSavedAt } = validSnapshot;

    it.each([
      ['expired (saved 13 h ago)', { ...validSnapshot, savedAt: NOW - 13 * HOUR }],
      ['future-dated (saved now + 10 min)', { ...validSnapshot, savedAt: NOW + 10 * MINUTE }],
      ['pre-savedAt (no savedAt at all)', withoutSavedAt],
    ])('%s → null, and the record is deleted', async (_label, stored) => {
      const { db } = fakeDb({ gameSnapshot: stored });
      const api = createSaveIdbApi(db);

      await expect(api.get('gameSnapshot')).resolves.toBeNull();
      expect(await db.get('save', 'gameSnapshot')).toBeUndefined(); // gone from the store
      expect(await api.get('gameSnapshot')).toBeNull();
    });

    it.each([
      ['fresh (saved 1 min ago)', NOW - MINUTE],
      ['just inside 12 h', NOW - 12 * HOUR],
      ['future skew boundary (now + 5 min)', NOW + 5 * MINUTE],
    ])('%s is returned and kept', async (_label, savedAt) => {
      const fresh = { ...validSnapshot, savedAt };
      const { db } = fakeDb({ gameSnapshot: fresh });
      const api = createSaveIdbApi(db);

      expect(await api.get('gameSnapshot')).toEqual(fresh);
      expect(await db.get('save', 'gameSnapshot')).toEqual(fresh);
    });
  });
});
