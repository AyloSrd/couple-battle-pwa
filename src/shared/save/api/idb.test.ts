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

  describe('gameSnapshot tighter bounds self-heal', () => {
    const q = (id: number) => ({
      id,
      theme: 'childhood' as const,
      difficulty: 'easy' as const,
      type: 'who_of_two' as const,
      you: `q${id}`,
      name: `q${id}`,
    });
    const twoTeams = [
      { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
      { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
    ];

    it.each([
      ['a teamId outside t1..t4', { ...validSnapshot, roster: [{ teamId: 'x1', avatarId: 'otters', players: ['A', 'B'] }] }],
      ['a 17-char player name', { ...validSnapshot, roster: [{ teamId: 't1', avatarId: 'otters', players: ['A'.repeat(17), 'B'] }] }],
      ['a blank player name', { ...validSnapshot, roster: [{ teamId: 't1', avatarId: 'otters', players: ['   ', 'B'] }] }],
      ['a 65-question deck', { ...validSnapshot, deck: Array.from({ length: 65 }, (_, i) => q(i + 1)) }],
      ['a 501-char question', { ...validSnapshot, deck: [{ ...q(1), you: 'x'.repeat(501) }] }],
      ['a score keyed by a non-team id (t5)', { ...validSnapshot, scores: { t1: 0, t5: 1 } }],
      ['a 41-char secret answer', { ...validSnapshot, secretAnswers: { 't1|1': 'x'.repeat(41) } }],
      ['a 33-char secret-answer key', { ...validSnapshot, secretAnswers: { ['k'.repeat(33)]: 'x' } }],
      [
        'coupleIdx out of roster range (2 with 2 teams)',
        {
          ...validSnapshot,
          roster: twoTeams,
          scores: { t1: 0, t2: 0 },
          cursor: { ...validSnapshot.cursor, phase: 'resolve', coupleIdx: 2 },
        },
      ],
      ['round past Ultime\'s last (4)', { ...validSnapshot, cursor: { ...validSnapshot.cursor, round: 4 } }],
      ['questionIdx past 64', { ...validSnapshot, cursor: { ...validSnapshot.cursor, questionIdx: 65 } }],
    ])('%s → null, and the record is deleted', async (_label, stored) => {
      const { db } = fakeDb({ gameSnapshot: stored });
      const api = createSaveIdbApi(db);

      await expect(api.get('gameSnapshot')).resolves.toBeNull();
      expect(await db.get('save', 'gameSnapshot')).toBeUndefined();
      expect(await api.get('gameSnapshot')).toBeNull();
    });

    it('boundary values a real game can hold are kept', async () => {
      const edge = {
        ...validSnapshot,
        roster: [
          ...twoTeams,
          { teamId: 't3', avatarId: 'pandas', players: ['E'.repeat(16), 'F'] },
          { teamId: 't4', avatarId: 'foxes', players: ['G', 'H'] },
        ],
        deck: Array.from({ length: 64 }, (_, i) => q(i + 1)),
        scores: { t1: 0, t2: 2, t3: 4, t4: 6 },
        secretAnswers: { 't4|1035': 'x'.repeat(40) },
        // questionIdx past deck.length is legitimate (short draw).
        cursor: { phase: 'rapidJudge', round: 3, coupleIdx: 3, questionIdx: 64 },
      };
      const { db } = fakeDb({ gameSnapshot: edge });
      const api = createSaveIdbApi(db);

      expect(await api.get('gameSnapshot')).toEqual(edge);
      expect(await db.get('save', 'gameSnapshot')).toEqual(edge);
    });
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
