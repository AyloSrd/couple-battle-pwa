import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IDBPDatabase } from 'idb';
import { createSaveIdbApi } from './idb';
import { SAVE_DEFAULTS, type TGameSnapshot } from '../domain/types';
import type { TGame } from '@/shared/game/domain/game';

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

const validGame: TGame = {
  ctx: {
    roster: [{ teamId: 't1', avatarId: 'otters', players: ['A', 'B'] }],
    mode: 'dilemma',
    difficulty: 'mix',
    themes: [],
    deck: [{ id: 1, type: 'who_of_two' }],
    scores: { t1: 0 },
    history: [],
    seg: 0,
    seq: 0,
  },
  step: { kind: 'ask', q: 0 },
};
const validSnapshot: TGameSnapshot = { game: validGame, savedAt: NOW - MINUTE };
/** The valid snapshot with ctx / step fields replaced. */
const withCtx = (patch: object) => ({ ...validSnapshot, game: { ...validGame, ctx: { ...validGame.ctx, ...patch } } });
const withGame = (ctx: object, step: object) => ({ ...validSnapshot, game: { ctx: { ...validGame.ctx, ...ctx }, step } });

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
    const stale = withCtx({ roster: [{ teamId: 't1', avatarId: 'frogs', players: ['A', 'B'] }] });
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
    const bad = withCtx({ roster: [{ teamId: 't1', avatarId: 'cocktails', players: ['A', 'B'] }] });
    await expect(api.put('gameSnapshot', bad as unknown as TGameSnapshot)).rejects.toThrow();
    expect(store.has('gameSnapshot')).toBe(false);
    await api.put('gameSnapshot', validSnapshot);
    expect(store.get('gameSnapshot')).toEqual(validSnapshot);
  });

  describe('gameSnapshot tighter bounds self-heal', () => {
    const card = (id: number) => ({ id, type: 'who_of_two' as const });
    const twoTeams = [
      { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
      { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
    ];
    const flashGuess = (secrets: Record<string, string>) =>
      withGame({ mode: 'flash' }, { kind: 'guess', q: 0, couple: 0, secrets });

    it.each([
      ['a teamId outside t1..t4', withCtx({ roster: [{ teamId: 'x1', avatarId: 'otters', players: ['A', 'B'] }], scores: {} })],
      ['a 17-char player name', withCtx({ roster: [{ teamId: 't1', avatarId: 'otters', players: ['A'.repeat(17), 'B'] }] })],
      ['a blank player name', withCtx({ roster: [{ teamId: 't1', avatarId: 'otters', players: ['   ', 'B'] }] })],
      ['a 65-card deck', withCtx({ deck: Array.from({ length: 65 }, (_, i) => card(i + 1)) })],
      ['a card of an unknown type', withCtx({ deck: [{ id: 1, type: 'essay' }] })],
      ['a score keyed by a non-team id (t5)', withCtx({ scores: { t1: 0, t5: 1 } })],
      ['a score for a team not in the roster (t2)', withCtx({ scores: { t1: 0, t2: 1 } })],
      ['a 41-char secret answer', flashGuess({ 't1|1': 'x'.repeat(41) })],
      ['a 33-char secret-answer key', flashGuess({ ['k'.repeat(33)]: 'x' })],
      [
        'couple out of roster range (2 with 2 teams)',
        withGame({ roster: twoTeams, scores: { t1: 0, t2: 0 } }, { kind: 'resolve', q: 0, couple: 2, results: {} }),
      ],
      ["a segment past Ultime's last (4)", withGame({ mode: 'ultime', seg: 4 }, { kind: 'scoreboard' })],
      ['a question index past the segment', withGame({}, { kind: 'ask', q: 1 })],
      ['a q past 64', withGame({}, { kind: 'ask', q: 65 })],
      ['a step of another segment', withGame({}, { kind: 'rapidJudge', q: 0, couple: 0 })],
      ['an unknown step kind', withGame({}, { kind: 'countdown', q: 0 })],
      ['a negative seq', withCtx({ seq: -1 })],
    ])('%s → null, and the record is deleted', async (_label, stored) => {
      const { db } = fakeDb({ gameSnapshot: stored });
      const api = createSaveIdbApi(db);

      await expect(api.get('gameSnapshot')).resolves.toBeNull();
      expect(await db.get('save', 'gameSnapshot')).toBeUndefined();
      expect(await api.get('gameSnapshot')).toBeNull();
    });

    it('a card carrying question text is read back as id + type only (the deck is language-free)', async () => {
      const { db } = fakeDb({ gameSnapshot: withCtx({ deck: [{ ...card(1), you: 'x'.repeat(501) }] }) });
      const read = await createSaveIdbApi(db).get('gameSnapshot');
      expect(read?.game.ctx.deck).toEqual([card(1)]);
    });

    it('a snapshot in the pre-redesign shape → null, and the record is deleted', async () => {
      const legacy = {
        roster: validGame.ctx.roster,
        mode: 'dilemma',
        difficulty: 'mix',
        themes: [],
        deck: [],
        cursor: { phase: 'question', round: 0, coupleIdx: 0, questionIdx: 0 },
        scores: { t1: 0 },
        secretAnswers: {},
        confirmed: {},
        history: [],
        savedAt: NOW - MINUTE,
      };
      const { db } = fakeDb({ gameSnapshot: legacy });
      await expect(createSaveIdbApi(db).get('gameSnapshot')).resolves.toBeNull();
      expect(await db.get('save', 'gameSnapshot')).toBeUndefined();
    });

    it.each([
      [
        'a 4-couple Ultime finale on its last card (64-card deck)',
        withGame(
          {
            roster: [
              ...twoTeams,
              { teamId: 't3', avatarId: 'pandas', players: ['E'.repeat(16), 'F'] },
              { teamId: 't4', avatarId: 'foxes', players: ['G', 'H'] },
            ],
            mode: 'ultime',
            deck: Array.from({ length: 64 }, (_, i) => card(i + 1)),
            scores: { t1: 0, t2: 2, t3: 4, t4: 6 },
            seg: 3,
            seq: 400,
          },
          { kind: 'rapidJudge', q: 4, couple: 3 },
        ),
      ],
      [
        'a 40-char locked secret on the guessers gate',
        withGame({ mode: 'flash', seg: 1 }, { kind: 'gate', side: 'guessers', secrets: { 't4|1035': 'x'.repeat(40) } }),
      ],
      // q past deck.length is legitimate (a short draw): Ultime's Dilemma is always 5.
      ['an Ultime Dilemma slot past a short deck', withGame({ mode: 'ultime', seg: 2 }, { kind: 'resolve', q: 4, couple: 0, results: {} })],
    ])('boundary values a real game can hold are kept: %s', async (_label, edge) => {
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
