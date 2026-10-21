import { describe, expect, it } from 'vitest';
import { joinNames, resolveOutcome } from './outcome';
import type { TRankedTeam } from './machine';
import type { TTeam } from '@/shared/game/domain/types';

const team = (id: string): TTeam => ({ teamId: id, avatarId: 'foxes', players: ['A', 'B'] });
const row = (id: string, score: number): TRankedTeam => ({ team: team(id), score, isWinner: false });
const ids = (rows: TRankedTeam[]) => rows.map((r) => r.team.teamId);

describe('resolveOutcome', () => {
  it('returns null for an empty ranking', () => {
    expect(resolveOutcome([])).toBeNull();
  });

  it('single winner', () => {
    const out = resolveOutcome([row('t1', 5), row('t2', 3), row('t3', 1)]);
    expect(out?.kind).toBe('winner');
    if (out?.kind === 'winner') expect(out.winner.team.teamId).toBe('t1');
  });

  it('2-way tie at the top, third team behind', () => {
    const out = resolveOutcome([row('t1', 4), row('t2', 4), row('t3', 1)]);
    expect(out?.kind).toBe('tie');
    if (out?.kind === 'tie') {
      expect(ids(out.teams)).toEqual(['t1', 't2']);
      expect(out.score).toBe(4);
    }
  });

  it('3-way tie', () => {
    const out = resolveOutcome([row('t1', 2), row('t2', 2), row('t3', 2)]);
    expect(out?.kind).toBe('tie');
    if (out?.kind === 'tie') expect(ids(out.teams)).toEqual(['t1', 't2', 't3']);
  });

  it('tie below the top is not a tie for the crown', () => {
    const out = resolveOutcome([row('t1', 6), row('t2', 2), row('t3', 2)]);
    expect(out?.kind).toBe('winner');
  });

  it('all zero is a tie of everyone', () => {
    const out = resolveOutcome([row('t1', 0), row('t2', 0)]);
    expect(out?.kind).toBe('tie');
    if (out?.kind === 'tie') {
      expect(ids(out.teams)).toEqual(['t1', 't2']);
      expect(out.score).toBe(0);
    }
  });

  it('solo (one team) is always the winner, even at 0', () => {
    expect(resolveOutcome([row('t1', 7)])?.kind).toBe('winner');
    expect(resolveOutcome([row('t1', 0)])?.kind).toBe('winner');
  });
});

describe('joinNames', () => {
  it('joins with a locale conjunction', () => {
    expect(joinNames(['Les Lions', 'Les Ours'], 'fr')).toBe('Les Lions et Les Ours');
    expect(joinNames(['The Lions', 'The Bears', 'The Owls'], 'en')).toBe('The Lions, The Bears, and The Owls');
  });

  it('handles a single name', () => {
    expect(joinNames(['Les Lions'], 'fr')).toBe('Les Lions');
  });
});
