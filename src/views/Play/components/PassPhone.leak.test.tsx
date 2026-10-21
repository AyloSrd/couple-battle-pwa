import { describe, expect, it } from 'vitest';
import { PassPhone } from './PassPhone';
import { mountLeakChecked } from '@/test/leakHarness';

// PassPhone has one effect: a one-shot sound cue on mount. No timers, no listeners —
// this pins that down (StrictMode double-invoke included) so it stays that way.
describe('PassPhone — no leaks', () => {
  it('plays its cue and leaves no timer or listener behind after unmount', () => {
    const { play, unmountAndAssertClean } = mountLeakChecked(
      <PassPhone variant="secret" avatarId="otters" name="Luca" teamName="Loutres" onConfirm={() => {}} />,
    );
    expect(play).toHaveBeenCalledWith('sfx.pass');
    unmountAndAssertClean();
  });
});
