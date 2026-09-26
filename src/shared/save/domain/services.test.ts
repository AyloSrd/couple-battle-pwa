import { describe, expect, it } from 'vitest';
import {
  newGameSnapshot,
  isSnapshotStale,
  SNAPSHOT_MAX_AGE_MS,
  SNAPSHOT_MAX_FUTURE_SKEW_MS,
} from './services';
import type { TRoster } from '@/shared/game/domain/types';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
  { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
];

describe('newGameSnapshot', () => {
  it('opens dilemma on the first question with everyone at zero', () => {
    const snap = newGameSnapshot({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: [] });
    expect(snap.cursor).toEqual({ phase: 'question', round: 0, coupleIdx: 0, questionIdx: 0 });
    expect(snap.scores).toEqual({ t1: 0, t2: 0 });
    expect(snap.secretAnswers).toEqual({});
  });

  it('opens flash on the answerers group gate', () => {
    const snap = newGameSnapshot({ roster, mode: 'flash', difficulty: 'mix', themes: [], deck: [] });
    expect(snap.cursor.phase).toBe('sideAnswerers');
  });

  it('opens ultime on its flash segment too (not the dilemma slice)', () => {
    const snap = newGameSnapshot({ roster, mode: 'ultime', difficulty: 'mix', themes: [], deck: [] });
    expect(snap.cursor.phase).toBe('sideAnswerers');
  });
});

describe('newGameSnapshot — savedAt', () => {
  it('stamps savedAt with the given clock', () => {
    const now = 1_790_000_000_000;
    const snap = newGameSnapshot({ roster, mode: 'flash', difficulty: 'mix', themes: [], deck: [] }, now);
    expect(snap.savedAt).toBe(now);
  });
});

describe('isSnapshotStale', () => {
  const now = 1_790_000_000_000;
  const at = (savedAt: number) =>
    newGameSnapshot({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: [] }, savedAt);

  it('uses a 12 h window and a 5 min future tolerance', () => {
    expect(SNAPSHOT_MAX_AGE_MS).toBe(12 * 60 * 60 * 1000);
    expect(SNAPSHOT_MAX_FUTURE_SKEW_MS).toBe(5 * 60 * 1000);
  });

  it('fresh snapshots are not stale', () => {
    expect(isSnapshotStale(at(now), now)).toBe(false);
    expect(isSnapshotStale(at(now - 60 * 1000), now)).toBe(false);
  });

  it('exactly 12 h old is still resumable; one ms past is stale', () => {
    expect(isSnapshotStale(at(now - SNAPSHOT_MAX_AGE_MS), now)).toBe(false);
    expect(isSnapshotStale(at(now - SNAPSHOT_MAX_AGE_MS - 1), now)).toBe(true);
  });

  it('up to 5 min in the future is tolerated; beyond that is stale', () => {
    expect(isSnapshotStale(at(now + SNAPSHOT_MAX_FUTURE_SKEW_MS), now)).toBe(false);
    expect(isSnapshotStale(at(now + SNAPSHOT_MAX_FUTURE_SKEW_MS + 1), now)).toBe(true);
  });
});
