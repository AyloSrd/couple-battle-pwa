import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWakeLockBrowserApi } from './browser';

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
  vi.stubGlobal('navigator', { wakeLock: { request } });
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

describe('createWakeLockBrowserApi', () => {
  let wl: ReturnType<typeof stubWakeLock>;
  beforeEach(() => {
    wl = stubWakeLock();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('releases a lock that is granted after release() (left Play mid-request)', async () => {
    const api = createWakeLockBrowserApi();
    void api.request();
    await api.release();
    wl.grant();
    await flush();

    expect(wl.sentinels[0]?.released).toBe(true);
  });

  it('holds a lock when re-requested right after a late grant was dropped', async () => {
    const api = createWakeLockBrowserApi();
    void api.request();
    await api.release();
    wl.grant(); // arrives after release → dropped
    await flush();
    void api.request();
    wl.grant();
    await flush();

    expect(wl.request).toHaveBeenCalledTimes(2);
    expect(wl.sentinels[1]?.released).toBe(false);
  });

  it('keeps a single request in flight (StrictMode / visibilitychange)', async () => {
    const api = createWakeLockBrowserApi();
    void api.request();
    void api.request();
    wl.grant();
    await flush();

    expect(wl.request).toHaveBeenCalledTimes(1);
    await api.release();
    expect(wl.sentinels[0]?.released).toBe(true);
  });

  it('re-acquires right after a release (Play → Home → Resume)', async () => {
    const api = createWakeLockBrowserApi();
    void api.request();
    wl.grant();
    await flush();

    void api.release();
    void api.request();
    wl.grant();
    await flush();

    expect(wl.request).toHaveBeenCalledTimes(2);
    expect(wl.sentinels[0]?.released).toBe(true);
    expect(wl.sentinels[1]?.released).toBe(false);
  });
});
