import { useEffect, useEffectEvent, useState } from 'react';

type TCountUpOpts = { steps: number; durationMs: number; onTick?: () => void; onDone?: () => void };

/** Count `steps` over `durationMs` (40–160 ms a step) and return the steps counted; `onTick` on
 *  every step but the last, `onDone` once when it lands (at mount if there is nothing to count). */
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
