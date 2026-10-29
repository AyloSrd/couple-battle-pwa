import { describe, expect, it } from 'vitest';
import { deckSizeFor, drawDeck, filterQuestions, modeQuestionTypes } from './services';
import type { TQuestion, TQuestionDifficulty, TQuestionType } from './types';

const Q: TQuestion[] = [
  { id: 1, theme: 'childhood', difficulty: 'easy', type: 'open', you: 'a', name: 'a of {name}' },
  { id: 2, theme: 'money', difficulty: 'hard', type: 'who_of_two', you: 'b', name: 'b' },
  { id: 3, theme: 'travel', difficulty: 'medium', type: 'yes_no', you: 'c', name: 'c of {name}' },
  { id: 4, theme: 'childhood', difficulty: 'easy', type: 'this_or_that', you: 'd', name: 'd of {name}' },
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
  it('flash (and Ultime\'s Flash segment) draw the open/this_or_that/yes_no set', () => {
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

describe('drawDeck — ultime', () => {
  const rng0 = () => 0;
  const DIFFICULTIES: TQuestionDifficulty[] = ['easy', 'medium', 'hard'];
  const TYPES: TQuestionType[] = ['open', 'this_or_that', 'yes_no', 'who_of_two'];
  // 10 questions of every type × difficulty → 120, ids 1..120.
  const POOL: TQuestion[] = TYPES.flatMap((type, t) =>
    DIFFICULTIES.flatMap((difficulty, d) =>
      Array.from({ length: 10 }, (_, i) => ({
        id: t * 30 + d * 10 + i + 1,
        theme: 'childhood' as const,
        difficulty,
        type,
        you: 'q',
        name: 'q of {name}',
      })),
    ),
  );
  const draw = (difficulty: 'mix' | 'easy' | 'medium' | 'hard', couples = 2, questions = POOL) =>
    drawDeck(questions, { mode: 'ultime', difficulty, themes: [], seenIds: [], size: deckSizeFor('ultime', couples) }, rng0);

  it('lays out Flash types, then 5 who_of_two, then open rapid-fire', () => {
    const deck = draw('mix');
    expect(deck).toHaveLength(deckSizeFor('ultime', 2));
    expect(deck.slice(0, 4).every((q) => q.type !== 'who_of_two')).toBe(true);
    expect(deck.slice(4, 9).every((q) => q.type === 'who_of_two')).toBe(true);
    expect(deck.slice(9).every((q) => q.type === 'open' && q.difficulty !== 'hard')).toBe(true);
  });

  it('never draws the same question twice across segments', () => {
    const ids = draw('mix', 4).map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the chosen difficulty for rapid-fire when it is easy or medium', () => {
    expect(draw('medium').slice(9).every((q) => q.difficulty === 'medium')).toBe(true);
  });

  it('falls back to easy/medium open questions for rapid-fire on Hard', () => {
    const deck = draw('hard');
    expect(deck).toHaveLength(deckSizeFor('ultime', 2));
    expect(deck.slice(0, 9).every((q) => q.difficulty === 'hard')).toBe(true);
    expect(deck.slice(9).every((q) => q.type === 'open' && q.difficulty !== 'hard')).toBe(true);
  });

  it('returns an empty deck when a segment is short, rather than shifting rounds', () => {
    const fewDilemmas = POOL.filter((q) => q.type !== 'who_of_two' || q.id % 10 === 1);
    expect(draw('mix', 2, fewDilemmas)).toEqual([]);
  });
});
