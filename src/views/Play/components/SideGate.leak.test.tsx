import { describe, expect, it } from 'vitest';
import { SideGate } from './SideGate';
import { mountLeakChecked } from '@/test/leakHarness';

// SideGate has one effect: a one-shot sound cue on mount. No timers, no listeners —
// this pins that down (StrictMode double-invoke included) so it stays that way.
describe('SideGate — no leaks', () => {
  it('plays its cue and leaves no timer or listener behind after unmount', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <SideGate side="answerers" onConfirm={() => {}} />,
    );
    expect(play).toHaveBeenCalledWith('sfx.pass');
    unmountAndAssertClean();
  });
});
