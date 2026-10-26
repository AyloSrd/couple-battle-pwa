import { describe, expect, it } from 'vitest';
import { fr } from './strings.fr';
import { en } from './strings.en';
import { es } from './strings.es';

const others = { en, es };
const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe('UI string dictionaries', () => {
  it.each(Object.entries(others))('%s exposes the exact same key set as FR', (_, dict) => {
    expect(Object.keys(dict).sort()).toEqual(Object.keys(fr).sort());
  });

  it.each(Object.entries(others))('%s keeps every {placeholder} of the FR value', (_, dict) => {
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(slots(dict[key]), key).toBe(slots(fr[key]));
    }
  });

  it('has no empty values in any language', () => {
    for (const [lang, dict] of Object.entries({ fr, ...others })) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `${lang}.${key}`).not.toBe('');
      }
    }
  });
});
