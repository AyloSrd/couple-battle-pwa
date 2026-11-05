import { afterEach, describe, expect, it } from 'vitest';
import { THEME_IDS } from '@/shared/game/domain/types';
import type { TGame, TStepKind } from '@/shared/game/domain/game';
import { GOLDEN_CASES } from '@/test/goldenTrace';
import { playScripted } from '@/test/scriptedGames';
import { MIGRATIONS, SAVE_VERSION, decode, encode, migrate, sameData } from './codec';
import { defaultProfile, type TProfile } from './types';

const NOW = Date.UTC(2026, 10, 5, 20, 0, 0);

/** A raw envelope string, for hand-made stored values. */
const envelope = (data: unknown, v = 1, savedAt = NOW) => JSON.stringify({ v, savedAt, data });

const validGame: TGame = {
  ctx: {
    roster: [{ teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bob'] }],
    mode: 'flash',
    difficulty: 'mix',
    themes: [...THEME_IDS],
    deck: [{ id: 12, type: 'open' }],
    scores: { t1: 0 },
    history: [],
    seg: 1,
    seq: 7,
  },
  step: { kind: 'guess', q: 0, couple: 0, secrets: { 't1|12': 'pizza' } },
};
const withCtx = (patch: object) => ({ ...validGame, ctx: { ...validGame.ctx, ...patch } });
const withStep = (step: object) => ({ ...validGame, step });
const decodeGame = (data: unknown) => decode('game', envelope(data)).kind;

describe('encode / decode — one codec both ways', () => {
  it('round-trips every state of every scripted game, covering all 13 step kinds', () => {
    const games = GOLDEN_CASES.flatMap((c) => playScripted(c));
    const kinds = new Set<TStepKind>(games.map((g) => g.step.kind));
    expect(kinds.size).toBe(13);
    for (const game of games) {
      expect(decode('game', encode('game', game, NOW))).toEqual({ kind: 'ok', data: game, savedAt: NOW });
    }
  });

  it('round-trips the default and a full profile', () => {
    const full: TProfile = {
      settings: { lang: 'es', sound: false, vibration: false },
      seenIds: [3, 1, 1135],
      guidelinesSeen: { flash: true, dilemma: false, ultime: true },
      soloBest: { flash: 8, dilemma: 10, ultime: 31 },
    };
    for (const profile of [defaultProfile(), full]) {
      expect(decode('profile', encode('profile', profile, NOW))).toEqual({ kind: 'ok', data: profile, savedAt: NOW });
    }
  });

  it('writes the current version in a { v, savedAt, data } envelope', () => {
    expect(JSON.parse(encode('profile', defaultProfile(), NOW))).toEqual({ v: SAVE_VERSION.profile, savedAt: NOW, data: defaultProfile() });
  });
});

describe('decode — what boot reads', () => {
  it.each([
    ['nothing stored', null, 'missing'],
    ['not JSON', '{"v":1,', 'invalid'],
    ['JSON but no envelope (the pre-refactor raw value)', JSON.stringify({ lang: 'fr', sound: true }), 'invalid'],
    ['an envelope without savedAt', JSON.stringify({ v: 1, data: {} }), 'invalid'],
    ['an older version with no migration path', envelope(defaultProfile(), 0), 'invalid'],
    ['a newer version (downgrade)', envelope(defaultProfile(), SAVE_VERSION.profile + 1), 'newer'],
    ['a profile that is not an object', envelope('hello'), 'invalid'],
  ])('profile: %s → %s', (_label, raw, kind) => {
    expect(decode('profile', raw).kind).toBe(kind);
  });

  it('game: a newer version is "newer", never parsed', () => {
    expect(decode('game', envelope({ anything: true }, SAVE_VERSION.game + 1)).kind).toBe('newer');
  });

  it('game: the pre-redesign shape (cursor + phase) is invalid', () => {
    const legacy = { roster: validGame.ctx.roster, mode: 'flash', deck: [], cursor: { phase: 'question', round: 0, coupleIdx: 0, questionIdx: 0 }, scores: { t1: 0 }, secretAnswers: {} };
    expect(decodeGame(legacy)).toBe('invalid');
  });

  it('game: a normal game (every theme selected) decodes', () => {
    expect(decodeGame(validGame)).toBe('ok');
  });

  const card = (id: number) => ({ id, type: 'who_of_two' as const });
  const twoTeams = [
    { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
    { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
  ];
  const dilemma = (step: object, ctx: object = {}) => ({ ctx: { ...validGame.ctx, mode: 'dilemma', seg: 0, ...ctx }, step });

  it.each([
    ['a retired team avatar', withCtx({ roster: [{ teamId: 't1', avatarId: 'frogs', players: ['A', 'B'] }] })],
    ['a teamId outside t1..t4', withCtx({ roster: [{ teamId: 'x1', avatarId: 'otters', players: ['A', 'B'] }], scores: {} })],
    ['a 17-char player name', withCtx({ roster: [{ teamId: 't1', avatarId: 'otters', players: ['A'.repeat(17), 'B'] }] })],
    ['a blank player name', withCtx({ roster: [{ teamId: 't1', avatarId: 'otters', players: ['   ', 'B'] }] })],
    ['more themes than exist', withCtx({ themes: [...THEME_IDS, THEME_IDS[0]] })],
    ['a 65-card deck', withCtx({ deck: Array.from({ length: 65 }, (_, i) => card(i + 1)) })],
    ['a card of an unknown type', withCtx({ deck: [{ id: 1, type: 'essay' }] })],
    ['a score keyed by a non-team id (t5)', withCtx({ scores: { t1: 0, t5: 1 } })],
    ['a score for a team not in the roster (t2)', withCtx({ scores: { t1: 0, t2: 1 } })],
    ['a 41-char secret answer', withStep({ ...validGame.step, secrets: { 't1|12': 'x'.repeat(41) } })],
    ['a 33-char secret-answer key', withStep({ ...validGame.step, secrets: { ['k'.repeat(33)]: 'x' } })],
    ['an unbounded number of secrets', withStep({ ...validGame.step, secrets: Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`t1|${i + 1}`, 'a'])) })],
    ['resolve results keyed by a non-team id', dilemma({ kind: 'resolve', q: 0, couple: 0, results: { x: 'miss' } })],
    ['resolve results for a team not in the roster', dilemma({ kind: 'resolve', q: 0, couple: 0, results: { t2: 'miss' } })],
    ['a couple out of roster range', dilemma({ kind: 'resolve', q: 0, couple: 2, results: {} }, { roster: twoTeams, scores: { t1: 0, t2: 0 } })],
    ["a segment past Ultime's last (4)", withGame({ mode: 'ultime', seg: 4 }, { kind: 'scoreboard' })],
    ['a question index past the segment', dilemma({ kind: 'ask', q: 1 })],
    ['a step of another segment', withStep({ kind: 'rapidAsk', q: 0, couple: 0 })],
    ['an unknown step kind', withStep({ kind: 'countdown', q: 0 })],
    ['a negative seq', withCtx({ seq: -1 })],
  ])('game: %s → invalid', (_label, data) => {
    expect(decodeGame(data)).toBe('invalid');
  });

  it('game: a tampered history is invalid (foreign team, bad stage, points above max, too many)', () => {
    const entry = { teamId: 't1', stage: 'rapid', round: 0, points: 2, max: 2 };
    const decodes = (history: object[]) => decodeGame(withCtx({ history })) === 'ok';
    expect(decodes([entry])).toBe(true);
    for (const bad of [{ teamId: 'x' }, { teamId: 't2' }, { stage: 'nope' }, { points: 3 }, { points: -1 }, { round: 4 }, { points: 1.5 }]) {
      expect(decodes([{ ...entry, ...bad }]), JSON.stringify(bad)).toBe(false);
    }
    expect(decodes(Array.from({ length: 257 }, () => entry))).toBe(false);
  });

  it.each([
    [
      'a 4-couple Ultime finale on its last card (64-card deck)',
      withGame(
        {
          roster: [...twoTeams, { teamId: 't3', avatarId: 'pandas', players: ['E'.repeat(16), 'F'] }, { teamId: 't4', avatarId: 'foxes', players: ['G', 'H'] }],
          mode: 'ultime',
          deck: Array.from({ length: 64 }, (_, i) => card(i + 1)),
          scores: { t1: 0, t2: 2, t3: 4, t4: 6 },
          seg: 3,
          seq: 400,
        },
        { kind: 'rapidJudge', q: 4, couple: 3 },
      ),
    ],
    ['a 40-char locked secret on the guessers gate', withGame({ seg: 1 }, { kind: 'gate', side: 'guessers', secrets: { 't4|1035': 'x'.repeat(40) } })],
    ['an Ultime Dilemma slot past a short deck', withGame({ mode: 'ultime', seg: 2 }, { kind: 'resolve', q: 4, couple: 0, results: {} })],
  ])('game: boundary values a real game can hold decode as-is: %s', (_label, data) => {
    expect(decode('game', envelope(data))).toEqual({ kind: 'ok', data, savedAt: NOW });
  });

  it('game: a card carrying question text is read back as id + type only (the deck is language-free)', () => {
    const decoded = decode('game', envelope(withCtx({ deck: [{ id: 12, type: 'open', you: 'x'.repeat(501) }] })));
    expect(decoded.kind === 'ok' && decoded.data.ctx.deck).toEqual([{ id: 12, type: 'open' }]);
  });
});

function withGame(ctx: object, step: object) {
  return { ctx: { ...validGame.ctx, ...ctx }, step };
}

describe('MIGRATIONS', () => {
  afterEach(() => {
    delete MIGRATIONS.profile[0];
  });

  it('is empty today: every stored value is at its current version', () => {
    expect(MIGRATIONS).toEqual({ profile: {}, game: {} });
    expect(SAVE_VERSION).toEqual({ profile: 1, game: 1 });
  });

  it('applies the steps in order, from the stored version up to the target', () => {
    const table = {
      1: (d: unknown) => [...(d as string[]), 'v1→v2'],
      2: (d: unknown) => [...(d as string[]), 'v2→v3'],
      3: (d: unknown) => [...(d as string[]), 'v3→v4'],
    };
    expect(migrate([], 1, 4, table)).toEqual(['v1→v2', 'v2→v3', 'v3→v4']);
    expect(migrate([], 2, 4, table)).toEqual(['v2→v3', 'v3→v4']);
    expect(migrate([], 0, 4, table)).toBeUndefined(); // a missing step is no path, never a guess
  });

  it('decode runs a registered entry before parsing (a v0 → v1 style upgrade)', () => {
    // v0 kept the settings flat; v1 nests them
    MIGRATIONS.profile[0] = (d) => {
      const { lang, sound, ...rest } = d as { lang: string; sound: boolean };
      return { ...rest, settings: { lang, sound } };
    };
    expect(decode('profile', envelope({ lang: 'en', sound: false, seenIds: [4] }, 0))).toEqual({
      kind: 'ok',
      savedAt: NOW,
      data: { ...defaultProfile(), settings: { lang: 'en', sound: false, vibration: true }, seenIds: [4] },
    });
  });
});

describe('sameData', () => {
  it('compares structurally and treats undefined keys as absent', () => {
    expect(sameData({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(sameData({ kind: 'scoreboard', resumeQ: undefined }, { kind: 'scoreboard' })).toBe(true);
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameData([1, 2], { 0: 1, 1: 2 })).toBe(false);
    expect(sameData(null, {})).toBe(false);
  });
});
