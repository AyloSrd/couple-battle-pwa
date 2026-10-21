import { describe, expect, it } from 'vitest';
import { SAVE_DEFAULTS, ZSettingsSchema } from './types';

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

  it('rejects a non-boolean vibration', () => {
    expect(ZSettingsSchema.safeParse({ lang: 'fr', sound: true, vibration: 'yes' }).success).toBe(false);
  });
});
