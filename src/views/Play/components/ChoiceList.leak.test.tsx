import { describe, expect, it } from 'vitest';
import { mountLeakChecked } from '@/test/leakHarness';
import { ChoiceList } from './ChoiceList';

const choices = [0, 1, 2].map((n) => ({ token: `c${n}`, label: `Option ${n}` }));

// ChoiceList has no effect of its own: a tap plays one cue, nothing runs on a timer, nothing is listened to on window / document.
describe('ChoiceList — no leaks', () => {
  it('pick mode: mounts silently and leaves no timer or listener behind after unmount', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(<ChoiceList mode="pick" choices={choices} onPick={() => {}} />);
    expect(play).not.toHaveBeenCalled(); // no cue on mount: only a tap sounds
    unmountAndAssertClean();
  });

  it('result mode: mounts silently and leaves no timer or listener behind after unmount', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <ChoiceList mode="result" choices={choices} truth="c1" picked="c0" truthName="Camille" pickedName="Alex" />,
    );
    expect(play).not.toHaveBeenCalled();
    unmountAndAssertClean();
  });

  it('pick mode shows nothing of an answer: it is given no truth, so no card is ringed, tagged or coloured', () => {
    const { unmountAndAssertClean } = mountLeakChecked(<ChoiceList mode="pick" choices={choices} onPick={() => {}} />);
    expect(document.querySelectorAll('.is-truth, .is-pick, .is-match, .is-miss, .cb-choice__tag')).toHaveLength(0);
    unmountAndAssertClean();
  });
});
