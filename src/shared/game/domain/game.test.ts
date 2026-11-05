import { describe, expect, it } from 'vitest';
import type { TQuestion } from '@/shared/questions/domain/types';
import {
  ZGameSchema,
  isGameConsistent,
  newGame,
  planOf,
  segmentOf,
  type TGame,
  type TStep,
} from './game';
import type { TRoster } from './types';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
  { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
];
const cards = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, type: 'open' as const }));

describe('planOf', () => {
  it('flash: two rounds', () => {
    expect(planOf('flash', 4)).toEqual([
      { kind: 'flash', round: 0 },
      { kind: 'flash', round: 1 },
    ]);
  });

  it('dilemma: one block over the whole deck, with the halfway board', () => {
    expect(planOf('dilemma', 10)).toEqual([{ kind: 'dilemma', from: 0, count: 10, halfway: true }]);
    expect(planOf('dilemma', 3)).toEqual([{ kind: 'dilemma', from: 0, count: 3, halfway: true }]);
  });

  it('ultime: flash × 2, then 5 Dilemma after the shared block, then rapid-fire (5 per couple)', () => {
    expect(planOf('ultime', 19)).toEqual([
      { kind: 'flash', round: 0 },
      { kind: 'flash', round: 1 },
      { kind: 'dilemma', from: 4, count: 5, halfway: false },
      { kind: 'rapid', from: 9, perCouple: 5 },
    ]);
    // a short draw does not change the layout
    expect(planOf('ultime', 2)).toEqual(planOf('ultime', 29));
  });
});

describe('newGame', () => {
  it('starts every team at zero, segment 0, seq 0, empty history', () => {
    const g = newGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: ['travel'], deck: cards(10) });
    expect(g.ctx).toMatchObject({ scores: { t1: 0, t2: 0 }, seg: 0, seq: 0, history: [], themes: ['travel'], difficulty: 'mix' });
    expect(ZGameSchema.parse(g)).toEqual(g);
  });

  it('opens each mode on its first segment step', () => {
    const open = (mode: 'flash' | 'dilemma' | 'ultime') => newGame({ roster, mode, difficulty: 'mix', themes: [], deck: cards(19) }).step;
    expect(open('dilemma')).toEqual({ kind: 'ask', q: 0 });
    expect(open('flash')).toEqual({ kind: 'gate', side: 'answerers', secrets: {} });
    expect(open('ultime')).toEqual({ kind: 'gate', side: 'answerers', secrets: {} });
  });

  it('keeps only id + type of each drawn card (the deck is language-free)', () => {
    const drawn: TQuestion[] = [{ id: 7, theme: 'travel', difficulty: 'easy', type: 'yes_no', you: 'Tu… ?', name: '{name}… ?' }];
    const g = newGame({ roster, mode: 'flash', difficulty: 'mix', themes: [], deck: drawn });
    expect(g.ctx.deck).toEqual([{ id: 7, type: 'yes_no' }]);
  });
});

describe('isGameConsistent', () => {
  const ultime = newGame({ roster, mode: 'ultime', difficulty: 'mix', themes: [], deck: cards(19) });
  const at = (step: TStep, seg = 0, game: TGame = ultime): TGame => ({ ctx: { ...game.ctx, seg }, step });

  it('accepts real steps of every segment', () => {
    const good: TGame[] = [
      ultime,
      at({ kind: 'secret', q: 1, couple: 1, secrets: {} }),
      at({ kind: 'judge', q: 0, couple: 0, secrets: { 't1|1': 'x' } }, 1),
      at({ kind: 'resolve', q: 4, couple: 1, results: { t1: 'match' } }, 2),
      at({ kind: 'rapidJudge', q: 4, couple: 1 }, 3),
      at({ kind: 'scoreboard' }, 2),
      at({ kind: 'final' }, 3),
    ];
    for (const g of good) expect(isGameConsistent(g), g.step.kind).toBe(true);
  });

  it('rejects a couple outside the roster', () => {
    expect(isGameConsistent(at({ kind: 'handoff', q: 0, couple: 2, secrets: {} }))).toBe(false);
    expect(isGameConsistent(at({ kind: 'rapidTurn', couple: 3 }, 3))).toBe(false);
  });

  it('rejects a question index outside the segment', () => {
    expect(isGameConsistent(at({ kind: 'guess', q: 2, couple: 0, secrets: {} }))).toBe(false); // Flash: 2 per round
    expect(isGameConsistent(at({ kind: 'ask', q: 5 }, 2))).toBe(false); // Ultime Dilemma: 5
    expect(isGameConsistent(at({ kind: 'rapidAsk', q: 5, couple: 0 }, 3))).toBe(false); // 5 per couple
    const dilemma = newGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: cards(3) });
    expect(isGameConsistent(at({ kind: 'ask', q: 3 }, 0, dilemma))).toBe(false);
    expect(isGameConsistent(at({ kind: 'scoreboard', resumeQ: 3 }, 0, dilemma))).toBe(false);
    expect(isGameConsistent(at({ kind: 'scoreboard', resumeQ: 1 }, 0, dilemma))).toBe(true);
  });

  it('rejects a step that does not belong to the segment, or a segment outside the plan', () => {
    expect(isGameConsistent(at({ kind: 'resolve', q: 0, couple: 0, results: {} }, 0))).toBe(false); // Flash seg
    expect(isGameConsistent(at({ kind: 'gate', side: 'guessers', secrets: {} }, 2))).toBe(false); // Dilemma seg
    expect(isGameConsistent(at({ kind: 'ask', q: 0 }, 3))).toBe(false); // rapid seg
    expect(isGameConsistent(at({ kind: 'scoreboard', resumeQ: 1 }, 1))).toBe(false); // resume outside Dilemma
    const flash = newGame({ roster, mode: 'flash', difficulty: 'mix', themes: [], deck: cards(4) });
    expect(segmentOf({ ...flash.ctx, seg: 2 })).toBeUndefined();
    expect(isGameConsistent(at({ kind: 'scoreboard' }, 2, flash))).toBe(false);
  });

  it('rejects team ids foreign to the roster (scores, history, results, duplicates)', () => {
    expect(isGameConsistent({ ...ultime, ctx: { ...ultime.ctx, scores: { t1: 0, t3: 2 } } })).toBe(false);
    const entry = { teamId: 't4', stage: 'flash' as const, round: 0, points: 0, max: 2 };
    expect(isGameConsistent({ ...ultime, ctx: { ...ultime.ctx, history: [entry] } })).toBe(false);
    expect(isGameConsistent(at({ kind: 'resolve', q: 0, couple: 0, results: { t3: 'miss' } }, 2))).toBe(false);
    const twin = { ...ultime, ctx: { ...ultime.ctx, roster: [roster[0]!, { ...roster[1]!, teamId: 't1' }] } };
    expect(isGameConsistent(twin)).toBe(false);
  });

  it('optionally checks every deck id against the bank', () => {
    expect(isGameConsistent(ultime, (id) => id <= 19)).toBe(true);
    expect(isGameConsistent(ultime, (id) => id !== 12)).toBe(false);
  });
});
