import { useEffect, useEffectEvent, useState } from 'react';

type TCountUpOpts = {
  /** Steps to count (one point each); 0 = already there. */
  steps: number;
  /** Total length of the count; each step lasts `durationMs / steps`, clamped to 40–160 ms. */
  durationMs: number;
  /** Every step but the last (the tally tick). */
  onTick?: () => void;
  /** Once, when the count lands (at mount when there is nothing to count). */
  onDone?: () => void;
};

/**
 * A count-up on an interval timer (an external clock: the one effect). Returns the steps
 * counted so far; mount the owner with a `key` to count again.
 */
export function useCountUp({ steps, durationMs, onTick, onDone }: TCountUpOpts): number {
  const [k, setK] = useState(0);
  const tick = useEffectEvent(() => onTick?.());
  const done = useEffectEvent(() => onDone?.());

  useEffect(() => {
    if (steps <= 0) {
      done();
      return;
    }
    const stepMs = Math.min(160, Math.max(40, Math.round(durationMs / steps)));
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setK(n);
      if (n < steps) {
        tick();
        return;
      }
      clearInterval(id);
      done();
    }, stepMs);
    return () => clearInterval(id);
  }, [steps, durationMs]);

  return Math.min(k, Math.max(steps, 0));
}
