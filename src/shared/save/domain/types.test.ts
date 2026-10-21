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

  it('seen question ids: the whole real pool passes, an oversized list is rejected', () => {
    const pool = Array.from({ length: 1035 }, (_, i) => i + 1);
    expect(ZSeenQuestionIdsSchema.safeParse(pool).success).toBe(true);
    const huge = Array.from({ length: SEEN_QUESTION_IDS_MAX + 1 }, (_, i) => i + 1);
    expect(ZSeenQuestionIdsSchema.safeParse(huge).success).toBe(false);
  });
});
