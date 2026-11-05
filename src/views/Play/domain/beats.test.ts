import { describe, expect, it } from 'vitest';
import { GOLDEN_CASES } from '@/test/goldenTrace';
import { playScripted } from '@/test/scriptedGames';
import { gameAt } from '@/test/gameStates';
import { boardBlockLength, countdownTicks, countedValue, previousScores } from './beats';
import { isAt, type TGameAt } from './machine';

describe('previousScores — the scoreboard tally starts from the previous board', () => {
  it('on every board of every scripted game: the totals the previous board showed (zeros on the first)', () => {
    const seen = { boards: 0, halfway: 0, scored: 0 };
    for (const c of GOLDEN_CASES) {
      let last: Record<string, number> | null = null;
      for (const game of playScripted(c)) {
        if (!isAt(game, 'scoreboard')) continue;
        seen.boards++;
        if (game.step.resumeQ !== undefined) seen.halfway++;
        if (last && Object.values(last).some((n) => n > 0)) seen.scored++;
        const start = Object.fromEntries(game.ctx.roster.map((t) => [t.teamId, 0]));
        expect(previousScores(game.ctx, boardBlockLength(game)), c.name).toEqual(last ?? start);
        last = Object.fromEntries(game.ctx.roster.map((t) => [t.teamId, game.ctx.scores[t.teamId] ?? 0]));
      }
    }
    // the net covers Flash boards, the halfway board and boards that start from real points
    expect(seen.boards).toBeGreaterThan(5);
    expect(seen.halfway).toBeGreaterThan(0);
    expect(seen.scored).toBeGreaterThan(0);
  });

  it('a history that does not add up to the scores (an old snapshot) gives null: no tally', () => {
    const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['A', 'B'] as [string, string] }];
    const entry = { teamId: 't1', stage: 'flash' as const, round: 0, points: 2, max: 2 };
    expect(previousScores({ roster, scores: { t1: 6 }, history: [entry] }, 1)).toBeNull();
    expect(previousScores({ roster, scores: { t1: 2 }, history: [entry] }, 3)).toBeNull();
    expect(previousScores({ roster, scores: { t1: 2 }, history: [entry, { ...entry, points: 0 }] }, 1)).toEqual({ t1: 2 });
  });
});

describe('countdownTicks — GF6: the full 3-2-1 opens a Dilemma block, 2-1 after', () => {
  const ask = (q: number, mode: 'ultime' | 'dilemma' = 'ultime', count = 6): TGameAt<'ask'> => {
    const base = gameAt('ask');
    const deck = Array.from({ length: count }, (_, i) => ({ id: i + 1, type: 'who_of_two' as const }));
    return { ctx: { ...base.ctx, mode, deck, seg: mode === 'dilemma' ? 0 : 2 }, step: { kind: 'ask', q } };
  };

  it('Ultime: 3 on the first question, 2 on the others', () => {
    expect(countdownTicks(ask(0))).toBe(3);
    expect([1, 2, 3, 4].map((q) => countdownTicks(ask(q)))).toEqual([2, 2, 2, 2]);
  });

  it('standalone Dilemma: 3 again on the first question after the halfway board', () => {
    expect([0, 1, 2, 3, 4, 5].map((q) => countdownTicks(ask(q, 'dilemma', 6)))).toEqual([3, 2, 2, 3, 2, 2]);
    expect([0].map((q) => countdownTicks(ask(q, 'dilemma', 1)))).toEqual([3]);
  });
});

describe('countedValue', () => {
  it('counts one point a step and stops at the target', () => {
    expect([0, 1, 2, 3, 9].map((k) => countedValue(4, 6, k))).toEqual([4, 5, 6, 6, 6]);
  });
});
