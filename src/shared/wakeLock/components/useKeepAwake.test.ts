import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeepAwake } from './useKeepAwake';

type TFakeSentinel = { released: boolean; release(): Promise<void>; addEventListener(): void };

/** `navigator.wakeLock` whose requests resolve only when the test says so. */
function stubWakeLock() {
  const pending: ((s: TFakeSentinel) => void)[] = [];
  const sentinels: TFakeSentinel[] = [];
  const request = vi.fn(
    () =>
      new Promise<TFakeSentinel>((resolve) => {
        pending.push(resolve);
      }),
  );
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  const grant = () => {
    const s: TFakeSentinel = {
      released: false,
      release: async () => {
        s.released = true;
      },
      addEventListener: () => {},
    };
    sentinels.push(s);
    pending.shift()?.(s);
  };
  return { request, sentinels, grant };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const becomeVisible = () => document.dispatchEvent(new Event('visibilitychange'));

describe('useKeepAwake', () => {
  let wl: ReturnType<typeof stubWakeLock>;
  beforeEach(() => {
    wl = stubWakeLock();
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('releases a lock that is granted after unmount (left Play mid-request)', async () => {
    const { unmount } = renderHook(() => useKeepAwake());
    unmount();
    wl.grant();
    await flush();

    expect(wl.sentinels[0]?.released).toBe(true);
  });

  it('holds a lock when mounted again right after a late grant was dropped', async () => {
    renderHook(() => useKeepAwake()).unmount();
    wl.grant(); // arrives after unmount → dropped
    await flush();
    renderHook(() => useKeepAwake());
    wl.grant();
    await flush();

    expect(wl.request).toHaveBeenCalledTimes(2);
    expect(wl.sentinels[1]?.released).toBe(false);
  });

  it('keeps a single request in flight (visibilitychange while requesting), and frees it on unmount', async () => {
    const { unmount } = renderHook(() => useKeepAwake());
    becomeVisible();
    becomeVisible();
    wl.grant();
    await flush();
    becomeVisible(); // already held: no new request

    expect(wl.request).toHaveBeenCalledTimes(1);
    unmount();
    expect(wl.sentinels[0]?.released).toBe(true);
  });

  it('re-acquires right after a release (Play → Home → Resume)', async () => {
    const first = renderHook(() => useKeepAwake());
    wl.grant();
    await flush();

    first.unmount();
    renderHook(() => useKeepAwake());
    wl.grant();
    await flush();

    expect(wl.request).toHaveBeenCalledTimes(2);
    expect(wl.sentinels[0]?.released).toBe(true);
    expect(wl.sentinels[1]?.released).toBe(false);
  });

  it('no Wake Lock API: nothing to do, nothing throws', () => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    expect(() => renderHook(() => useKeepAwake()).unmount()).not.toThrow();
  });
});
