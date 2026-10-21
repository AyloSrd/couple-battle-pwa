import { vi } from 'vitest';

type TTarget = Window | Document;
type TAny = (this: TTarget, type: string, ...rest: unknown[]) => void;

/**
 * Counts add/removeEventListener calls on `window` and `document`, per event type, so a
 * leak test can assert they balance once the component under test is unmounted.
 * Install it AFTER a warm-up render: React registers its own one-time document listeners
 * (e.g. `selectionchange`) on first use and never removes them.
 */
export function probeListeners() {
  const balance = new Map<string, number>();
  const bump = (type: string, by: number) => balance.set(type, (balance.get(type) ?? 0) + by);
  const spies = ([window, document] as TTarget[]).flatMap((target) => {
    // Capture the originals BEFORE spying, or the wrapper would call itself.
    const add = target.addEventListener as unknown as TAny;
    const remove = target.removeEventListener as unknown as TAny;
    return [
      vi.spyOn(target, 'addEventListener').mockImplementation(function (this: TTarget, type: string, ...rest: unknown[]) {
        bump(type, 1);
        return add.call(this, type, ...rest);
      } as never),
      vi.spyOn(target, 'removeEventListener').mockImplementation(function (this: TTarget, type: string, ...rest: unknown[]) {
        bump(type, -1);
        return remove.call(this, type, ...rest);
      } as never),
    ];
  });
  return {
    /** Event types whose add/remove counts differ (empty when everything was cleaned up). */
    unbalanced: () => [...balance].filter(([, n]) => n !== 0),
    /** Event types that were ever added. */
    added: () => [...balance].map(([type]) => type),
    restore: () => spies.forEach((s) => s.mockRestore()),
  };
}
