import { describe, expect, it } from 'vitest';
import { QuestionType, ZQuestionSchema, ZQuestionTypeSchema } from './types';

/** The question schema: four classic types share `you` / `name`; `choice` is its own shape (one `question`, exactly 3 `options`). */

const base = { id: 1136, theme: 'homeDaily', difficulty: 'easy' };
const classic = { ...base, type: 'open', you: 'ton petit-déj ?', name: 'le petit-déj de {name} ?' };
const choice = { ...base, type: 'choice', question: 'La porte claque. Ton premier réflexe ?', options: ['A', 'B', 'C'] };
const ok = (row: unknown) => ZQuestionSchema.safeParse(row).success;

describe('QuestionType', () => {
  it('knows choice, next to the four classic types', () => {
    expect(QuestionType.Choice).toBe('choice');
    expect(ZQuestionTypeSchema.options.slice().sort()).toEqual(['choice', 'open', 'this_or_that', 'who_of_two', 'yes_no']);
  });
});

describe('ZQuestionSchema: the four classic types keep { id, theme, difficulty, type, you, name }', () => {
  it.each(['open', 'this_or_that', 'yes_no', 'who_of_two'])('%s parses', (type) => {
    expect(ok({ ...classic, type })).toBe(true);
  });

  it.each([
    ['no you', { ...classic, you: undefined }],
    ['no name', { ...classic, name: undefined }],
    ['an empty you', { ...classic, you: '' }],
    ['a question field instead of you / name', { ...base, type: 'open', question: 'q' }],
  ])('refuses %s', (_label, row) => {
    expect(ok(row)).toBe(false);
  });
});

describe('ZQuestionSchema: a choice row', () => {
  it('parses { id, theme, difficulty, type, question, options }', () => {
    const parsed = ZQuestionSchema.parse(choice);
    expect(parsed).toEqual(choice);
  });

  it('carries no you / name: they are not kept', () => {
    const parsed = ZQuestionSchema.parse({ ...choice, you: 'x', name: 'y' }) as Record<string, unknown>;
    expect(parsed['you']).toBeUndefined();
    expect(parsed['name']).toBeUndefined();
  });

  it.each([
    ['2 options', { ...choice, options: ['A', 'B'] }],
    ['4 options', { ...choice, options: ['A', 'B', 'C', 'D'] }],
    ['no options', { ...choice, options: undefined }],
    ['an empty option', { ...choice, options: ['A', '', 'C'] }],
    ['a non-string option', { ...choice, options: ['A', 2, 'C'] }],
    ['no question', { ...choice, question: undefined }],
    ['an empty question', { ...choice, question: '' }],
    ['a you field instead of question', { ...base, type: 'choice', you: 'q', options: ['A', 'B', 'C'] }],
    ['you and name instead of question', { ...base, type: 'choice', you: 'q', name: 'q', options: ['A', 'B', 'C'] }],
    ['an unknown type', { ...choice, type: 'pick' }],
  ])('refuses %s', (_label, row) => {
    expect(ok(row)).toBe(false);
  });

  it('keeps the runtime caps loose: 200 characters pass (strict 140 / 100 are bank tests, not a crash)', () => {
    expect(ok({ ...choice, question: 'q'.repeat(200), options: ['o'.repeat(200), 'B', 'C'] })).toBe(true);
    expect(ok({ ...choice, question: 'q'.repeat(150), options: ['o'.repeat(120), 'B', 'C'] })).toBe(true);
  });

  it('still refuses absurd strings (a cap exists)', () => {
    expect(ok({ ...choice, question: 'q'.repeat(2000) })).toBe(false);
    expect(ok({ ...choice, options: ['o'.repeat(2000), 'B', 'C'] })).toBe(false);
  });
});
