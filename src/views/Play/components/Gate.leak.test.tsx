import { describe, expect, it } from 'vitest';
import { Gate } from './Gate';
import { mountLeakChecked } from '@/test/leakHarness';
import { gameAt, testRoster } from '@/test/gameStates';

// Every Gate variant has one effect: a one-shot sound cue on mount. No timers, no listeners —
// this pins that down (StrictMode double-invoke included) so it stays that way.
describe('Gate — no leaks', () => {
  it('side gate (≥ 2 couples): plays the pass cue and leaves no timer or listener behind', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <Gate game={gameAt('gate', { side: 'answerers' })} dispatch={() => {}} />,
    );
    expect(play).toHaveBeenCalledWith('sfx.pass');
    unmountAndAssertClean();
  });

  it('pass-phone gate (solo): plays the pass cue and leaves no timer or listener behind', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <Gate game={gameAt('gate', { roster: [testRoster[0]!] })} dispatch={() => {}} />,
    );
    expect(play).toHaveBeenCalledWith('sfx.pass');
    unmountAndAssertClean();
  });

  it('handoff: plays the whoosh and leaves no timer or listener behind', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(<Gate game={gameAt('handoff')} dispatch={() => {}} />);
    expect(play).toHaveBeenCalledWith('sfx.whoosh');
    unmountAndAssertClean();
  });
});
