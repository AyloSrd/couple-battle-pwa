import { describe, expect, it } from 'vitest';
import { newGame, type TGame } from '@/shared/game/domain/game';
import type { TRoster } from '@/shared/game/domain/types';
import { GAME_MAX_AGE_MS, GAME_MAX_FUTURE_SKEW_MS, isGameStale, mergeFinish, recoveryOf } from './services';
import { defaultProfile } from './types';

const now = 1_790_000_000_000;
const solo: TRoster = [{ teamId: 't1', avatarId: 'otters', players: ['A', 'B'] }];
const duo: TRoster = [...solo, { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] }];
const deck = [
  { id: 4, type: 'who_of_two' as const },
  { id: 9, type: 'who_of_two' as const },
];

/** A finished game (`final`) with the given scores. */
function finalGame(roster: TRoster, scores: Record<string, number>, mode: 'dilemma' | 'flash' = 'dilemma'): TGame {
  const game = newGame({ roster, mode, difficulty: 'mix', themes: [], deck });
  return { ctx: { ...game.ctx, scores }, step: { kind: 'final' } };
}

describe('isGameStale', () => {
  it('uses a 12 h window and a 5 min future tolerance', () => {
    expect(GAME_MAX_AGE_MS).toBe(12 * 60 * 60 * 1000);
    expect(GAME_MAX_FUTURE_SKEW_MS).toBe(5 * 60 * 1000);
  });

  it('fresh games are not stale', () => {
    expect(isGameStale(now, now)).toBe(false);
    expect(isGameStale(now - 60 * 1000, now)).toBe(false);
  });

  it('exactly 12 h old is still resumable; one ms past is stale', () => {
    expect(isGameStale(now - GAME_MAX_AGE_MS, now)).toBe(false);
    expect(isGameStale(now - GAME_MAX_AGE_MS - 1, now)).toBe(true);
  });

  it('up to 5 min in the future is tolerated; beyond that is stale', () => {
    expect(isGameStale(now + GAME_MAX_FUTURE_SKEW_MS, now)).toBe(false);
    expect(isGameStale(now + GAME_MAX_FUTURE_SKEW_MS + 1, now)).toBe(true);
  });
});

describe('recoveryOf', () => {
  const running = newGame({ roster: solo, mode: 'dilemma', difficulty: 'mix', themes: [], deck });
  const opts = { now, hasQuestion: (id: number) => id !== 404 };

  it('a final game is replayed first, even when old', () => {
    expect(recoveryOf(finalGame(solo, { t1: 1 }), now - 2 * GAME_MAX_AGE_MS, opts)).toBe('finish');
  });

  it('a stale running game is dropped quietly', () => {
    expect(recoveryOf(running, now - GAME_MAX_AGE_MS - 1, opts)).toBe('stale');
    expect(recoveryOf(running, now + GAME_MAX_FUTURE_SKEW_MS + 1, opts)).toBe('stale');
  });

  it('a deck id missing from the bank discards the game', () => {
    const unknown = { ...running, ctx: { ...running.ctx, deck: [{ id: 404, type: 'who_of_two' as const }] } };
    expect(recoveryOf(unknown, now, opts)).toBe('discard');
  });

  it('anything else resumes', () => {
    expect(recoveryOf(running, now - 60 * 1000, opts)).toBe('resume');
  });
});

describe('mergeFinish', () => {
  it('adds the deck to the seen ids (a union, in order) and raises the solo best', () => {
    const before = { ...defaultProfile(), seenIds: [9, 1], soloBest: { flash: 3, dilemma: 1, ultime: 0 } };
    const { profile, soloResult } = mergeFinish(before, finalGame(solo, { t1: 2 }));
    expect(profile.seenIds).toEqual([9, 1, 4]);
    expect(profile.soloBest).toEqual({ flash: 3, dilemma: 2, ultime: 0 });
    expect(soloResult).toEqual({ isBest: true, points: 2, best: 2 });
    expect(before.seenIds).toEqual([9, 1]); // pure
  });

  it('reports the best read BEFORE the merge: no new best on a lower or equal score', () => {
    const before = { ...defaultProfile(), soloBest: { flash: 0, dilemma: 5, ultime: 0 } };
    expect(mergeFinish(before, finalGame(solo, { t1: 5 })).soloResult).toEqual({ isBest: false, points: 5, best: 5 });
    expect(mergeFinish(before, finalGame(solo, { t1: 1 })).soloResult).toEqual({ isBest: false, points: 1, best: 5 });
  });

  it('is idempotent: replaying the same final changes nothing more', () => {
    const final = finalGame(solo, { t1: 2 });
    const once = mergeFinish(defaultProfile(), final).profile;
    expect(mergeFinish(once, final).profile).toEqual(once);
  });

  it('a group game only marks its questions seen (no solo best, no solo line)', () => {
    const { profile, soloResult } = mergeFinish(defaultProfile(), finalGame(duo, { t1: 7, t2: 3 }));
    expect(profile.seenIds).toEqual([4, 9]);
    expect(profile.soloBest).toEqual(defaultProfile().soloBest);
    expect(soloResult).toBeNull();
  });
});
