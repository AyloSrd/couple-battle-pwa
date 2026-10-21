import { describe, expect, it } from 'vitest';
import { Handoff } from './Handoff';
import { mountLeakChecked } from '@/test/leakHarness';

// Handoff has one effect: a one-shot sound cue on mount. No timers, no listeners —
// this pins that down (StrictMode double-invoke included) so it stays that way.
describe('Handoff — no leaks', () => {
  it('plays its cue and leaves no timer or listener behind after unmount', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <Handoff avatarId="otters" teamName="Loutres" name="Luca" onConfirm={() => {}} />,
    );
    expect(play).toHaveBeenCalledWith('sfx.whoosh');
    unmountAndAssertClean();
  });
});
