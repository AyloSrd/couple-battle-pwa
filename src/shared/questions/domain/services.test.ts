import { describe, expect, it } from 'vitest';
import { filterQuestions } from './services';
import type { TQuestion } from './types';

const Q: TQuestion[] = [
  { id: 1, theme: 'childhood', difficulty: 'easy', type: 'open', text: 'a' },
  { id: 2, theme: 'money', difficulty: 'hard', type: 'who_of_two', text: 'b' },
  { id: 3, theme: 'travel', difficulty: 'medium', type: 'yes_no', text: 'c' },
  { id: 4, theme: 'childhood', difficulty: 'easy', type: 'this_or_that', text: 'd' },
];

describe('filterQuestions', () => {
  it('returns all with no constraints', () => {
    expect(filterQuestions(Q, {})).toHaveLength(4);
  });

  it('filters by type', () => {
    const r = filterQuestions(Q, { types: ['who_of_two'] });
    expect(r.map((q) => q.id)).toEqual([2]);
  });

  it('treats mix difficulty as no constraint', () => {
    expect(filterQuestions(Q, { difficulty: 'mix' })).toHaveLength(4);
  });

  it('filters by concrete difficulty', () => {
    expect(filterQuestions(Q, { difficulty: 'easy' }).map((q) => q.id)).toEqual([1, 4]);
  });

  it('filters by themes', () => {
    expect(filterQuestions(Q, { themes: ['childhood'] }).map((q) => q.id)).toEqual([1, 4]);
  });

  it('excludes seen ids', () => {
    expect(filterQuestions(Q, { excludeIds: [1, 4] }).map((q) => q.id)).toEqual([2, 3]);
  });

  it('combines constraints (AND)', () => {
    const r = filterQuestions(Q, { themes: ['childhood'], types: ['open'] });
    expect(r.map((q) => q.id)).toEqual([1]);
  });
});
