import { describe, expect, it } from 'vitest';
import { gameStats, heartOf, teamStats } from './stats';
import type { THistoryEntry } from './machine';

const e = (
  teamId: string,
  stage: THistoryEntry['stage'],
  points: number,
  max: number,
  round = 0,
): THistoryEntry => ({ teamId, stage, round, points, max });

describe('heartOf', () => {
  it('full when every point was won, half when some, empty when none', () => {
    expect(heartOf({ points: 2, max: 2 })).toBe('full');
    expect(heartOf({ points: 1, max: 1 })).toBe('full');
    expect(heartOf({ points: 1, max: 2 })).toBe('half');
    expect(heartOf({ points: 0, max: 2 })).toBe('empty');
    expect(heartOf({ points: 0, max: 1 })).toBe('empty');
  });
});

describe('teamStats', () => {
  it('no history (an old snapshot): zeros and nothing to chart', () => {
    expect(teamStats([], 't1')).toEqual({
      teamId: 't1',
      earned: 0,
      possible: 0,
      syncPct: 0,
      byStage: [],
      flashRounds: [],
      hearts: [],
    });
  });

  it('standalone Dilemma: one stage, one heart per question, rounded percentage', () => {
    const history = [e('t1', 'dilemma', 1, 1), e('t1', 'dilemma', 0, 1), e('t1', 'dilemma', 1, 1)];
    const s = teamStats(history, 't1');
    expect(s.earned).toBe(2);
    expect(s.possible).toBe(3);
    expect(s.syncPct).toBe(67);
    expect(s.byStage).toEqual([{ stage: 'dilemma', earned: 2, possible: 3 }]);
    expect(s.hearts).toEqual(['full', 'empty', 'full']);
    expect(s.flashRounds).toEqual([]);
  });

  it('standalone Flash: close answers are half hearts, rounds are split', () => {
    const history = [
      e('t1', 'flash', 2, 2, 0),
      e('t1', 'flash', 1, 2, 0),
      e('t1', 'flash', 0, 2, 1),
      e('t1', 'flash', 2, 2, 1),
    ];
    const s = teamStats(history, 't1');
    expect(s.hearts).toEqual(['full', 'half', 'empty', 'full']);
    expect(s.byStage).toEqual([{ stage: 'flash', earned: 5, possible: 8 }]);
    expect(s.flashRounds).toEqual([
      { round: 0, earned: 3, possible: 4 },
      { round: 1, earned: 2, possible: 4 },
    ]);
    expect(s.syncPct).toBe(63);
  });

  it('Ultime: all three stages, in play order whatever the entry order', () => {
    const history = [
      e('t1', 'flash', 2, 2, 0),
      e('t1', 'flash', 0, 2, 1),
      e('t1', 'dilemma', 1, 1),
      e('t1', 'rapid', 2, 2),
      e('t1', 'rapid', 0, 2),
    ];
    const s = teamStats(history, 't1');
    expect(s.byStage.map((b) => b.stage)).toEqual(['flash', 'dilemma', 'rapid']);
    expect(s.byStage).toEqual([
      { stage: 'flash', earned: 2, possible: 4 },
      { stage: 'dilemma', earned: 1, possible: 1 },
      { stage: 'rapid', earned: 2, possible: 4 },
    ]);
    expect(s.earned).toBe(5);
    expect(s.possible).toBe(9);
    expect(s.syncPct).toBe(56);
    expect(s.hearts).toHaveLength(5);
  });

  it('only counts the asked team', () => {
    const history = [e('t1', 'dilemma', 1, 1), e('t2', 'dilemma', 0, 1)];
    expect(teamStats(history, 't2')).toMatchObject({ earned: 0, possible: 1, syncPct: 0, hearts: ['empty'] });
  });

  it('a perfect team is 100, a team that missed everything is 0', () => {
    expect(teamStats([e('t1', 'rapid', 2, 2)], 't1').syncPct).toBe(100);
    expect(teamStats([e('t1', 'rapid', 0, 2)], 't1').syncPct).toBe(0);
  });
});

describe('gameStats', () => {
  it('returns one entry per team, in the given order; ties get identical numbers', () => {
    const history = [e('t1', 'dilemma', 1, 1), e('t2', 'dilemma', 1, 1)];
    const all = gameStats(history, ['t2', 't1']);
    expect(all.map((s) => s.teamId)).toEqual(['t2', 't1']);
    expect(all[0]?.syncPct).toBe(all[1]?.syncPct);
  });

  it('a solo game has a single entry', () => {
    expect(gameStats([e('t1', 'dilemma', 1, 1)], ['t1'])).toHaveLength(1);
  });
});
