import { describe, expect, it } from 'vitest';
import { SEEN_IDS_MAX, ZProfileSchema, ZSettingsSchema, defaultProfile } from './types';

describe('ZSettingsSchema — per-field defaults', () => {
  it('an old save without vibration still parses, with vibration on', () => {
    expect(ZSettingsSchema.parse({ lang: 'en', sound: false })).toEqual({ lang: 'en', sound: false, vibration: true });
  });

  it('keeps vibration off when saved off', () => {
    expect(ZSettingsSchema.parse({ lang: 'fr', sound: true, vibration: false }).vibration).toBe(false);
  });

  it('the default settings are FR, sound on, vibration on, and parse as themselves', () => {
    expect(defaultProfile().settings).toEqual({ lang: 'fr', sound: true, vibration: true });
    expect(ZSettingsSchema.parse(defaultProfile().settings)).toEqual(defaultProfile().settings);
  });

  it('a corrupt (non-boolean) vibration falls back to on and keeps lang and sound', () => {
    expect(ZSettingsSchema.parse({ lang: 'en', sound: false, vibration: 'yes' })).toEqual({ lang: 'en', sound: false, vibration: true });
  });

  it('accepts every shipped language', () => {
    for (const lang of ['fr', 'en', 'es']) expect(ZSettingsSchema.parse({ lang, sound: true }).lang).toBe(lang);
  });

  it('a corrupt lang or sound resets only that field (one bad field never costs the others)', () => {
    expect(ZSettingsSchema.parse({ lang: 'de', sound: false, vibration: false })).toEqual({ lang: 'fr', sound: false, vibration: false });
    expect(ZSettingsSchema.parse({ lang: 'es', sound: 'yes', vibration: false })).toEqual({ lang: 'es', sound: true, vibration: false });
  });
});

describe('ZProfileSchema', () => {
  it('fills every missing field with its default', () => {
    expect(ZProfileSchema.parse({})).toEqual(defaultProfile());
  });

  it('seen ids: one bad id is dropped, every other id kept (never a wipe)', () => {
    expect(ZProfileSchema.parse({ seenIds: [1, 'x', -3, 2.5, null, 7, 7] }).seenIds).toEqual([1, 7]);
  });

  it('seen ids: the whole real pool passes; an oversized list falls back to empty', () => {
    const pool = Array.from({ length: 1135 }, (_, i) => i + 1);
    expect(ZProfileSchema.parse({ seenIds: pool }).seenIds).toEqual(pool);
    const huge = Array.from({ length: SEEN_IDS_MAX + 1 }, (_, i) => i + 1);
    expect(ZProfileSchema.parse({ seenIds: huge }).seenIds).toEqual([]);
  });

  it('guideline flags and solo bests reset per field', () => {
    const profile = ZProfileSchema.parse({
      guidelinesSeen: { flash: true, dilemma: 'yes' },
      soloBest: { flash: 9, dilemma: -1, ultime: 1.5 },
    });
    expect(profile.guidelinesSeen).toEqual({ flash: true, dilemma: false, ultime: false });
    expect(profile.soloBest).toEqual({ flash: 9, dilemma: 0, ultime: 0 });
  });

  it('rejects data that is not a profile at all (boot keeps the raw copy and says so)', () => {
    for (const data of ['hello', 42, null, [1, 2]]) expect(ZProfileSchema.safeParse(data).success).toBe(false);
  });

  it('defaultProfile returns a fresh object each call', () => {
    expect(defaultProfile()).not.toBe(defaultProfile());
    expect(defaultProfile().seenIds).not.toBe(defaultProfile().seenIds);
  });
});
