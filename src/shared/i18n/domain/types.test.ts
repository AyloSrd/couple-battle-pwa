import { describe, expect, it } from 'vitest';
import { Lang, LANG_NAMES, LANGS } from './types';

/** P15: the language list, one place. `LANGS` is the DISPLAY order of the pickers (Home menu, Settings pills). */

describe('the language list', () => {
  it('has Italian: Lang.It is "it"', () => {
    expect(Lang.It).toBe('it');
  });

  it('LANGS lists fr, en, es, it in that order (the order the pickers show)', () => {
    expect([...LANGS]).toEqual(['fr', 'en', 'es', 'it']);
  });

  it('every language has its own name, shown as is in every UI language (Italian is "Italiano")', () => {
    expect(LANG_NAMES).toEqual({ fr: 'Français', en: 'English', es: 'Español', it: 'Italiano' });
    expect(Object.keys(LANG_NAMES).sort()).toEqual([...LANGS].sort());
  });
});
