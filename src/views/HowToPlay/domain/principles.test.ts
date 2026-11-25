import { describe, expect, it } from 'vitest';
import { fr } from '@/data/strings.fr';
import { en } from '@/data/strings.en';
import { es } from '@/data/strings.es';
import { it as italian } from '@/data/strings.it';
import { PRINCIPLES } from './principles';

const dicts = { fr, en, es, it: italian } as unknown as Record<string, Record<string, string>>;

describe('PRINCIPLES', () => {
  it('has the four principles in order: phone, split, roles, win', () => {
    expect(PRINCIPLES.map((p) => p.id)).toEqual(['phone', 'split', 'roles', 'win']);
  });

  it('names its string keys after the id', () => {
    for (const p of PRINCIPLES) {
      expect(p.title).toBe(`howto.principles.${p.id}.title`);
      expect(p.body).toBe(`howto.principles.${p.id}.body`);
    }
  });

  it('gives the emoji badges 📱, 🙈, 👑 to phone, roles, win; split has none (its visual is the seating diagram)', () => {
    const badge = (id: string) => (PRINCIPLES.find((p) => p.id === id) as { badge?: string | null }).badge;
    expect(badge('phone')).toBe('📱');
    expect(badge('roles')).toBe('🙈');
    expect(badge('win')).toBe('👑');
    expect(badge('split') ?? null).toBeNull();
  });

  it.each(Object.keys(dicts))('every title and body key exists, non-empty, in %s', (code) => {
    for (const p of PRINCIPLES) {
      for (const key of [p.title, p.body]) {
        const value = dicts[code]![key];
        expect(typeof value, `${code} ${key}`).toBe('string');
        expect(value!.trim(), `${code} ${key}`).not.toBe('');
      }
    }
  });
});
