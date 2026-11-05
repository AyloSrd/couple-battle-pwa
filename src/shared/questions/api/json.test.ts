import { describe, expect, it } from 'vitest';
import questionsFr from '@/data/questions.fr.json';
import questionsEn from '@/data/questions.en.json';
import questionsEs from '@/data/questions.es.json';
import type { TQuestion } from '../domain/types';
import { createQuestionsJsonApi } from './json';

const fr = questionsFr as TQuestion[];
const others = { en: questionsEn as TQuestion[], es: questionsEs as TQuestion[] };
const all = { fr, ...others };

describe('bundled question catalogs', () => {
  it('parse through the adapter for every language', () => {
    const api = createQuestionsJsonApi();
    for (const lang of ['fr', 'en', 'es'] as const) {
      expect(api.list({ lang })).toHaveLength(fr.length);
    }
  });

  it('parses a language on first use only: an unused language is never read', () => {
    const api = createQuestionsJsonApi({ fr, en: 'not a bank', es: null });
    expect(api.list({ lang: 'fr' })).toHaveLength(fr.length);
    expect(api.list({ lang: 'fr' })).toEqual(api.list({ lang: 'fr' }));
    expect(() => api.list({ lang: 'en' })).toThrow(); // read, and rejected, only when asked for
  });

  it('have unique ids', () => {
    for (const [lang, qs] of Object.entries(all)) {
      expect(new Set(qs.map((q) => q.id)).size, lang).toBe(qs.length);
    }
  });

  // Ids are language-independent (seen-ids, resume), so every row must line up with FR.
  it.each(Object.entries(others))('%s matches FR id, theme, difficulty and type row by row', (_, qs) => {
    expect(qs.map(({ id, theme, difficulty, type }) => [id, theme, difficulty, type])).toEqual(
      fr.map(({ id, theme, difficulty, type }) => [id, theme, difficulty, type]),
    );
  });

  it.each(Object.entries(all))('%s keeps the {name} slot contract', (_, qs) => {
    for (const q of qs) {
      expect(q.you, `${q.id} you`).not.toContain('{name}');
      if (q.type === 'who_of_two') {
        expect(q.name, `${q.id} who_of_two`).toBe(q.you);
      } else {
        expect(q.name.split('{name}').length - 1, `${q.id} name`).toBe(1);
      }
    }
  });
});
