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
  const snapshot = {
    roster: [{ teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bob'] }],
    mode: 'flash',
    difficulty: 'mix',
    themes: [...THEME_IDS],
    deck: [],
    cursor: { phase: 'question', round: 1, coupleIdx: 0, questionIdx: 0 },
    scores: { t1: 0 },
    secretAnswers: { 't1|12': 'pizza' },
    confirmed: { t1: 'match' },
    savedAt: 1,
  };

  it('a normal snapshot (every theme selected) still parses', () => {
    expect(ZGameSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it('rejects more themes than exist', () => {
    const themes = [...THEME_IDS, THEME_IDS[0]];
    expect(ZGameSnapshotSchema.safeParse({ ...snapshot, themes }).success).toBe(false);
  });

  it('rejects confirmed results keyed by anything but a roster teamId', () => {
    expect(ZGameSnapshotSchema.safeParse({ ...snapshot, confirmed: { x: 'miss' } }).success).toBe(false);
  });

  it('rejects an unbounded number of secret answers', () => {
    const secretAnswers = Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`t1|${i + 1}`, 'a']));
    expect(ZGameSnapshotSchema.safeParse({ ...snapshot, secretAnswers }).success).toBe(false);
  });

  it('a snapshot saved before history existed still parses, to an empty history', () => {
    const parsed = ZGameSnapshotSchema.parse(snapshot);
    expect(parsed.history).toEqual([]);
  });

  it('keeps a real history', () => {
    const history = [
      { teamId: 't1', stage: 'flash', round: 1, points: 1, max: 2 },
      { teamId: 't1', stage: 'dilemma', round: 0, points: 0, max: 1 },
    ];
    expect(ZGameSnapshotSchema.parse({ ...snapshot, history }).history).toEqual(history);
  });

  it('rejects a tampered history: foreign team, bad stage, points above max, too many entries', () => {
    const entry = { teamId: 't1', stage: 'rapid', round: 0, points: 2, max: 2 };
    const bad = (e: object) => ZGameSnapshotSchema.safeParse({ ...snapshot, history: [e] }).success;
    expect(bad(entry)).toBe(true);
    expect(bad({ ...entry, teamId: 'x' })).toBe(false);
    expect(bad({ ...entry, stage: 'nope' })).toBe(false);
    expect(bad({ ...entry, points: 3 })).toBe(false);
    expect(bad({ ...entry, points: -1 })).toBe(false);
    expect(bad({ ...entry, round: 4 })).toBe(false);
    expect(bad({ ...entry, points: 1.5 })).toBe(false);
    const huge = Array.from({ length: 257 }, () => entry);
    expect(ZGameSnapshotSchema.safeParse({ ...snapshot, history: huge }).success).toBe(false);
  });

  it('seen question ids: the whole real pool passes, an oversized list is rejected', () => {
    const pool = Array.from({ length: 1135 }, (_, i) => i + 1);
    expect(ZSeenQuestionIdsSchema.safeParse(pool).success).toBe(true);
    const huge = Array.from({ length: SEEN_QUESTION_IDS_MAX + 1 }, (_, i) => i + 1);
    expect(ZSeenQuestionIdsSchema.safeParse(huge).success).toBe(false);
  });
});
