import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '@/shared/game/domain/types';
import {
  SAVE_DEFAULTS,
  SEEN_QUESTION_IDS_MAX,
  ZGameSnapshotSchema,
  ZSeenQuestionIdsSchema,
  ZSettingsSchema,
} from './types';

describe('ZSettingsSchema — vibration', () => {
  it('an old save without the field still parses, with vibration on', () => {
    expect(ZSettingsSchema.parse({ lang: 'en', sound: false })).toEqual({
      lang: 'en',
      sound: false,
      vibration: true,
    });
  });

  it('a new save keeps vibration off', () => {
    expect(ZSettingsSchema.parse({ lang: 'fr', sound: true, vibration: false }).vibration).toBe(false);
  });

  it('the default settings have vibration on', () => {
    expect(SAVE_DEFAULTS.settings.vibration).toBe(true);
    expect(ZSettingsSchema.parse(SAVE_DEFAULTS.settings)).toEqual(SAVE_DEFAULTS.settings);
  });

  it('a corrupt (non-boolean) vibration falls back to on and keeps lang and sound', () => {
    expect(ZSettingsSchema.parse({ lang: 'en', sound: false, vibration: 'yes' })).toEqual({
      lang: 'en',
      sound: false,
      vibration: true,
    });
  });

  it('accepts every shipped language', () => {
    for (const lang of ['fr', 'en', 'es']) {
      expect(ZSettingsSchema.safeParse({ lang, sound: true, vibration: true }).success, lang).toBe(true);
    }
  });

  it('still rejects a corrupt lang or sound', () => {
    expect(ZSettingsSchema.safeParse({ lang: 'de', sound: true, vibration: true }).success).toBe(false);
    expect(ZSettingsSchema.safeParse({ lang: 'fr', sound: 'yes' }).success).toBe(false);
  });
});

describe('persisted bounds — a tampered record is rejected, a real one passes', () => {
  const game = {
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
  const snapshot = { game, savedAt: 1 };
  const withCtx = (patch: object) => ({ ...snapshot, game: { ...game, ctx: { ...game.ctx, ...patch } } });
  const withStep = (step: object) => ({ ...snapshot, game: { ...game, step } });

  it('a normal snapshot (every theme selected) still parses', () => {
    expect(ZGameSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it('rejects more themes than exist', () => {
    const themes = [...THEME_IDS, THEME_IDS[0]];
    expect(ZGameSnapshotSchema.safeParse(withCtx({ themes })).success).toBe(false);
  });

  it('rejects resolve results keyed by anything but a roster teamId', () => {
    const dilemma = { mode: 'dilemma', seg: 0 };
    const resolve = (results: object) => ({ ...withCtx(dilemma), game: { ctx: { ...game.ctx, ...dilemma }, step: { kind: 'resolve', q: 0, couple: 0, results } } });
    expect(ZGameSnapshotSchema.safeParse(resolve({ t1: 'match' })).success).toBe(true);
    expect(ZGameSnapshotSchema.safeParse(resolve({ x: 'miss' })).success).toBe(false);
    expect(ZGameSnapshotSchema.safeParse(resolve({ t2: 'miss' })).success).toBe(false); // not in this roster
  });

  it('rejects an unbounded number of secret answers', () => {
    const secrets = Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`t1|${i + 1}`, 'a']));
    expect(ZGameSnapshotSchema.safeParse(withStep({ ...game.step, secrets })).success).toBe(false);
  });

  it('a snapshot in the pre-redesign shape (cursor + phase, no game) no longer parses', () => {
    const legacy = { roster: game.ctx.roster, mode: 'flash', deck: [], cursor: { phase: 'question', round: 0, coupleIdx: 0, questionIdx: 0 }, scores: { t1: 0 }, secretAnswers: {}, savedAt: 1 };
    expect(ZGameSnapshotSchema.safeParse(legacy).success).toBe(false);
  });

  it('rejects an inconsistent game (a step outside its segment)', () => {
    expect(ZGameSnapshotSchema.safeParse(withStep({ kind: 'rapidAsk', q: 0, couple: 0 })).success).toBe(false);
  });

  it('keeps a real history', () => {
    const history = [
      { teamId: 't1', stage: 'flash', round: 1, points: 1, max: 2 },
      { teamId: 't1', stage: 'dilemma', round: 0, points: 0, max: 1 },
    ];
    expect(ZGameSnapshotSchema.parse(withCtx({ history })).game.ctx.history).toEqual(history);
  });

  it('rejects a tampered history: foreign team, bad stage, points above max, too many entries', () => {
    const entry = { teamId: 't1', stage: 'rapid', round: 0, points: 2, max: 2 };
    const bad = (e: object) => ZGameSnapshotSchema.safeParse(withCtx({ history: [e] })).success;
    expect(bad(entry)).toBe(true);
    expect(bad({ ...entry, teamId: 'x' })).toBe(false);
    expect(bad({ ...entry, teamId: 't2' })).toBe(false); // well-formed, but not in the roster
    expect(bad({ ...entry, stage: 'nope' })).toBe(false);
    expect(bad({ ...entry, points: 3 })).toBe(false);
    expect(bad({ ...entry, points: -1 })).toBe(false);
    expect(bad({ ...entry, round: 4 })).toBe(false);
    expect(bad({ ...entry, points: 1.5 })).toBe(false);
    const huge = Array.from({ length: 257 }, () => entry);
    expect(ZGameSnapshotSchema.safeParse(withCtx({ history: huge })).success).toBe(false);
  });

  it('seen question ids: the whole real pool passes, an oversized list is rejected', () => {
    const pool = Array.from({ length: 1135 }, (_, i) => i + 1);
    expect(ZSeenQuestionIdsSchema.safeParse(pool).success).toBe(true);
    const huge = Array.from({ length: SEEN_QUESTION_IDS_MAX + 1 }, (_, i) => i + 1);
    expect(ZSeenQuestionIdsSchema.safeParse(huge).success).toBe(false);
  });
});
