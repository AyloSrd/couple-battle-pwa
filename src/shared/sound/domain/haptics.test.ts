import { describe, expect, it } from 'vitest';
import { hapticFor } from './haptics';
import type { TSoundId } from './types';

const ALL: TSoundId[] = [
  'sfx.tap', 'sfx.back', 'sfx.error', 'sfx.whoosh', 'sfx.select', 'sfx.toggle.on', 'sfx.toggle.off', 'sfx.lock',
  'sfx.pass', 'sfx.reveal', 'sfx.point.exact', 'sfx.point.close', 'sfx.point.miss', 'sfx.countdown.tick',
  'sfx.countdown.go', 'sfx.score.tally', 'sfx.synchro', 'sfx.mismatch', 'sfx.confetti', 'mus.round', 'mus.fanfare',
];
const total = (p: number | number[]) => (Array.isArray(p) ? p : [p]);

describe('hapticFor — the cue table, gated by the vibration setting', () => {
  it('off: nothing ever buzzes', () => {
    for (const id of ALL) expect(hapticFor(id, false)).toBeNull();
  });

  it('on: buttons tick lightly, outcomes have their own shape, the countdown buzzes as it always did', () => {
    expect(hapticFor('sfx.tap', true)).toBe(10);
    expect(hapticFor('sfx.lock', true)).toBe(15);
    expect(hapticFor('sfx.reveal', true)).toBe(25);
    expect(hapticFor('sfx.point.exact', true)).toEqual(hapticFor('sfx.synchro', true));
    expect(hapticFor('sfx.point.miss', true)).toEqual(hapticFor('sfx.mismatch', true));
    expect(hapticFor('sfx.point.close', true)).not.toEqual(hapticFor('sfx.point.exact', true));
    expect(hapticFor('sfx.countdown.tick', true)).toBe(50);
    expect(hapticFor('sfx.countdown.go', true)).toEqual([60, 40, 60]);
  });

  it('screen cues, tally ticks, confetti and the toggles stay still', () => {
    for (const id of ['sfx.whoosh', 'sfx.pass', 'sfx.score.tally', 'sfx.confetti', 'mus.round', 'sfx.toggle.on'] as const) {
      expect(hapticFor(id, true)).toBeNull();
    }
  });

  it('every buzz outside the countdown stays tiny (10–40 ms each)', () => {
    for (const id of ALL) {
      if (id.startsWith('sfx.countdown')) continue;
      const p = hapticFor(id, true);
      if (p === null) continue;
      total(p).forEach((ms, i) => {
        if (i % 2 === 0) expect(ms).toBeGreaterThanOrEqual(10);
        if (i % 2 === 0) expect(ms).toBeLessThanOrEqual(40);
      });
    }
  });
});
