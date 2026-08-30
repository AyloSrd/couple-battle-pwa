import { describe, expect, it } from 'vitest';
import { fr } from './strings.fr';
import { en } from './strings.en';

describe('UI string dictionaries', () => {
  it('FR and EN expose the exact same key set', () => {
    const frKeys = Object.keys(fr).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(frKeys);
  });

  it('has no empty values in either language', () => {
    for (const [key, value] of Object.entries(fr)) {
      expect(value, `fr.${key}`).not.toBe('');
    }
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key}`).not.toBe('');
    }
  });
});
