import { describe, expect, it } from 'vitest';
import { Judge } from './Judge';
import { answerKey } from '@/shared/game';
import type { TGameAt } from '../domain/machine';
import { mountLeakChecked } from '@/test/leakHarness';

const game: TGameAt<'judge'> = {
  ctx: {
    roster: [{ teamId: 't1', avatarId: 'otters', players: ['A', 'B'] }],
    mode: 'flash',
    difficulty: 'mix',
    themes: [],
    deck: [{ id: 1, type: 'open' }],
    scores: {},
    history: [],
    seg: 0,
    seq: 3,
  },
  step: { kind: 'judge', q: 0, couple: 0, secrets: { [answerKey('t1', 1)]: 'Paris' } },
};
const question = { id: 1, theme: 'childhood' as const, difficulty: 'easy' as const, type: 'open' as const, you: 'q', name: 'q' };

// Judge has one effect: a one-shot reveal cue on mount. No timers, no listeners.
describe('Judge — no leaks', () => {
  it('plays the reveal cue and leaves no timer or listener behind after unmount', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <Judge game={game} question={question} dispatch={() => {}} />,
    );
    expect(play).toHaveBeenCalledWith('sfx.reveal');
    unmountAndAssertClean();
  });
});
