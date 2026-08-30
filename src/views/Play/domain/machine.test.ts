import { describe, expect, it } from 'vitest';
import { initGame, reduce, toSnapshot, fromSnapshot, rankTeams } from './machine';
import type { TGameConfig } from './machine';
import type { TRoster } from '@/shared/game/domain/types';
import type { TQuestion } from '@/shared/questions/domain/types';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
  { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
];

const deck: TQuestion[] = [
  { id: 1, theme: 'childhood', difficulty: 'easy', type: 'open', text: 'q' },
];

const config: TGameConfig = { roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck };

describe('Play machine', () => {
  it('initGame starts everyone at zero on the first question', () => {
    const s = initGame(config);
    expect(s.kind).toBe('question');
    expect(s.scores).toEqual({ t1: 0, t2: 0 });
  });

  it('award adds points and stays on the question', () => {
    const s = reduce(initGame(config), { type: 'award', teamId: 't1', points: 2 });
    expect(s.kind).toBe('question');
    expect(s.scores.t1).toBe(2);
  });

  it('award accumulates', () => {
    let s = initGame(config);
    s = reduce(s, { type: 'award', teamId: 't1', points: 2 });
    s = reduce(s, { type: 'award', teamId: 't1', points: 1 });
    expect(s.scores.t1).toBe(3);
  });

  it('finish moves to the final, preserving scores', () => {
    const played = reduce(initGame(config), { type: 'award', teamId: 't2', points: 2 });
    const final = reduce(played, { type: 'finish' });
    expect(final.kind).toBe('final');
    expect(final.scores.t2).toBe(2);
  });

  it('final is terminal', () => {
    const final = reduce(reduce(initGame(config), { type: 'finish' }), { type: 'finish' });
    expect(final.kind).toBe('final');
  });

  it('round-trips through a snapshot', () => {
    const played = reduce(initGame(config), { type: 'award', teamId: 't1', points: 2 });
    const restored = fromSnapshot(toSnapshot(played));
    expect(restored).toEqual(played);
  });

  it('ranks teams with the leader first and shared crown on ties', () => {
    const played = reduce(initGame(config), { type: 'award', teamId: 't2', points: 2 });
    const ranked = rankTeams(played);
    expect(ranked[0]?.team.teamId).toBe('t2');
    expect(ranked[0]?.isWinner).toBe(true);
    expect(ranked[1]?.isWinner).toBe(false);

    const tied = rankTeams(initGame(config)); // 0-0
    expect(tied.every((r) => r.isWinner)).toBe(true);
  });
});
