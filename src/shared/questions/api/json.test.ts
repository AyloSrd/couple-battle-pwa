import { describe, expect, it } from 'vitest';
import questionsFr from '@/data/questions.fr.json';
import questionsEn from '@/data/questions.en.json';
import questionsEs from '@/data/questions.es.json';
import questionsIt from '@/data/questions.it.json';
import { bankProblems, CHOICE_OPTION_MAX, CHOICE_QUESTION_MAX } from '@/test/bankRules';
import type { TQuestion } from '../domain/types';
import { createQuestionsJsonApi } from './json';

const fr = questionsFr as TQuestion[];
const others = { en: questionsEn as TQuestion[], es: questionsEs as TQuestion[], it: questionsIt as TQuestion[] };
const all = { fr, ...others };

describe('bundled question catalogs', () => {
  it('parse through the adapter for every language', () => {
    const api = createQuestionsJsonApi();
    for (const lang of ['fr', 'en', 'es', 'it'] as const) {
      expect(api.list({ lang })).toHaveLength(fr.length);
    }
  });

  it('parses a language on first use only: an unused language is never read', () => {
    const api = createQuestionsJsonApi({ fr, en: 'not a bank', es: null, it: 7 });
    expect(api.list({ lang: 'fr' })).toHaveLength(fr.length);
    expect(api.list({ lang: 'fr' })).toEqual(api.list({ lang: 'fr' }));
    expect(() => api.list({ lang: 'en' })).toThrow(); // read, and rejected, only when asked for
    expect(() => api.list({ lang: 'it' })).toThrow(); // Italian is a language of the loader like the others
  });

  it('serve the Italian bank as its own file: 1195 rows, the ids of FR, Italian text', () => {
    const italian = createQuestionsJsonApi().list({ lang: 'it' });
    expect(italian).toHaveLength(1195);
    expect(italian.map((q) => q.id)).toEqual(fr.map((q) => q.id));
    expect(italian).toEqual(questionsIt);
    expect(italian).not.toEqual(createQuestionsJsonApi().list({ lang: 'fr' }));
  });

  it('have unique ids', () => {
    for (const [lang, qs] of Object.entries(all)) {
      expect(new Set(qs.map((q) => q.id)).size, lang).toBe(qs.length);
    }
  });

  // Ids are language-independent (seen-ids, resume), so every row must line up with FR.
  it.each(Object.entries(others))('%s matches FR id, theme, difficulty, type and option count row by row', (lang, qs) => {
    expect(bankProblems({ fr, [lang]: qs }).filter((p) => p.startsWith(`${lang}: `))).toEqual([]);
  });

  it.each(Object.entries(all))('%s keeps the {name} slot contract and the choice limits', (lang, qs) => {
    expect(bankProblems({ fr, [lang]: qs }).filter((p) => p.startsWith(`${lang} #`))).toEqual([]);
  });
});

describe('the bank rules, proven on a fixture with choice rows', () => {
  const choice = (id: number, patch: Partial<Extract<TQuestion, { type: 'choice' }>> = {}): TQuestion => ({
    id,
    theme: 'homeDaily',
    difficulty: 'easy',
    type: 'choice',
    question: `Question ${id} ?`,
    options: ['A', 'B', 'C'],
    ...patch,
  });
  const classic: TQuestion[] = [
    { id: 1, theme: 'childhood', difficulty: 'easy', type: 'who_of_two', you: 'q1', name: 'q1' },
    { id: 2, theme: 'travel', difficulty: 'hard', type: 'open', you: 'q2', name: 'q2 de {name}' },
  ];
  const good = [...classic, choice(3), choice(4)];

  it('the limits are 140 for the question and 100 for an option', () => {
    expect([CHOICE_QUESTION_MAX, CHOICE_OPTION_MAX]).toEqual([140, 100]);
  });

  it('a sound bank, the same in every language, has no problem (limits included: 140 and 100 pass)', () => {
    const edge = [...classic, choice(3, { question: 'q'.repeat(140), options: ['o'.repeat(100), 'B', 'C'] })];
    expect(bankProblems({ fr: edge, en: edge, es: edge, it: edge })).toEqual([]);
    expect(bankProblems({ fr: good, en: good, es: good, it: good })).toEqual([]);
  });

  it('the schema accepts the good rows and serves them through the JSON adapter', () => {
    const api = createQuestionsJsonApi({ fr: good, en: good, es: good, it: good });
    expect(api.list({ lang: 'fr', types: ['choice'] }).map((q) => q.id)).toEqual([3, 4]);
  });

  it.each([
    ['a question over 140', choice(3, { question: 'q'.repeat(141) }), 'question too long'],
    ['an option over 100', choice(3, { options: ['A', 'o'.repeat(101), 'C'] }), 'option too long'],
    ['a {name} in the question', choice(3, { question: 'Que fait {name} ?' }), '{name} in a choice'],
    ['a {name} in an option', choice(3, { options: ['A', 'pour {name}', 'C'] }), '{name} in a choice'],
  ])('flags %s', (_label, bad, problem) => {
    expect(bankProblems({ fr: [...classic, bad] })).toEqual([`fr #3: ${problem}`]);
  });

  it('flags an option count that is not 3 (the schema refuses such a row too)', () => {
    const two = choice(3, { options: ['A', 'B'] as unknown as [string, string, string] });
    expect(bankProblems({ fr: [...classic, two] })).toEqual(['fr #3: not 3 options']);
    expect(() => createQuestionsJsonApi({ fr: [two], en: [], es: [], it: [] }).list({ lang: 'fr' })).toThrow();
  });

  it('flags a language whose ids, order, theme, difficulty, type or option count differ from FR', () => {
    const swapped = [good[0]!, good[1]!, good[3]!, good[2]!];
    const otherTheme = [...classic, choice(3, { theme: 'travel' }), choice(4)];
    const otherType = [...classic, { ...classic[0]!, id: 3 } as TQuestion, choice(4)];
    const missing = good.slice(0, 3);
    for (const en of [swapped, otherTheme, otherType, missing]) {
      expect(bankProblems({ fr: good, en })).toContain('en: ids, order, theme, difficulty, type or option count differ from fr');
    }
  });

  it('keeps the {name} contract of the four classic types', () => {
    const bad: TQuestion[] = [
      { id: 5, theme: 'travel', difficulty: 'easy', type: 'open', you: 'q {name}', name: 'q {name}' },
      { id: 6, theme: 'travel', difficulty: 'easy', type: 'yes_no', you: 'q', name: 'no slot' },
      { id: 7, theme: 'travel', difficulty: 'easy', type: 'who_of_two', you: 'a', name: 'b' },
    ];
    expect(bankProblems({ fr: bad }).map((p) => p.split(':')[0])).toEqual(['fr #5', 'fr #6', 'fr #7']);
  });
});
