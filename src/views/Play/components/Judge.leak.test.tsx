import { describe, expect, it } from 'vitest';
import { Judge } from './Judge';
import { answerKey, type TGameState } from '../domain/machine';
import { mountLeakChecked } from '@/test/leakHarness';

const state: Extract<TGameState, { kind: 'judge' }> = {
  kind: 'judge',
  round: 0,
  questionIdx: 0,
  coupleIdx: 0,
  secretAnswers: { [answerKey('t1', 1)]: 'Paris' },
  roster: [{ teamId: 't1', avatarId: 'otters', players: ['A', 'B'] }],
  mode: 'flash',
  difficulty: 'mix',
  themes: [],
  deck: [{ id: 1, theme: 'childhood', difficulty: 'easy', type: 'open', you: 'q', name: 'q' }],
  scores: {},
};

// Judge has one effect: a one-shot reveal cue on mount. No timers, no listeners.
describe('Judge — no leaks', () => {
  it('plays the reveal cue and leaves no timer or listener behind after unmount', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <Judge state={state} answererName="A" onJudge={() => {}} />,
    );
    expect(play).toHaveBeenCalledWith('sfx.reveal');
    unmountAndAssertClean();
  });
});
