import { describe, expect, it } from 'vitest';
import { newGameSnapshot } from './services';
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

  it('opens flash at the pass-phone step', () => {
    const snap = newGameSnapshot({ roster, mode: 'flash', difficulty: 'mix', themes: [], deck: [] });
    expect(snap.cursor.phase).toBe('passSecret');
  });
});
