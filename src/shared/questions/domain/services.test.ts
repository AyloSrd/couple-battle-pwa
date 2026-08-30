import { describe, expect, it } from 'vitest';
import { drawDeck, filterQuestions, modeQuestionTypes } from './services';
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

describe('modeQuestionTypes', () => {
  it('dilemma draws only who_of_two', () => {
    expect(modeQuestionTypes('dilemma')).toEqual(['who_of_two']);
  });
  it('flash and ultime draw the open/this_or_that/yes_no set', () => {
    expect(modeQuestionTypes('flash')).toEqual(['open', 'this_or_that', 'yes_no']);
    expect(modeQuestionTypes('ultime')).toEqual(['open', 'this_or_that', 'yes_no']);
  });
});

describe('drawDeck', () => {
  // Deterministic rng: always 0 → Fisher-Yates leaves order effectively stable.
  const rng0 = () => 0;

  it('draws only mode-compatible types and respects size', () => {
    const deck = drawDeck(Q, { mode: 'dilemma', difficulty: 'mix', themes: [], seenIds: [], size: 5 }, rng0);
    expect(deck.every((q) => q.type === 'who_of_two')).toBe(true);
    expect(deck).toHaveLength(1); // only one who_of_two in the fixture
  });

  it('excludes seen ids', () => {
    const deck = drawDeck(Q, { mode: 'flash', difficulty: 'mix', themes: [], seenIds: [1], size: 10 }, rng0);
    expect(deck.some((q) => q.id === 1)).toBe(false);
  });

  it('caps at the requested size', () => {
    const deck = drawDeck(Q, { mode: 'flash', difficulty: 'mix', themes: [], seenIds: [], size: 1 }, rng0);
    expect(deck).toHaveLength(1);
  });
});
