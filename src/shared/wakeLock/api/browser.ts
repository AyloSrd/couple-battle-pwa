import type { TWakeLockApi } from './index';

// Minimal structural types — avoids depending on lib.dom shipping the Wake Lock API.
type TWakeLockSentinel = {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
};
type TNavigatorWakeLock = { request(type: 'screen'): Promise<TWakeLockSentinel> };

function getWakeLock(): TNavigatorWakeLock | null {
  const wl = (navigator as unknown as { wakeLock?: TNavigatorWakeLock }).wakeLock;
  return wl ?? null;
}

/** Screen wake lock backed by `navigator.wakeLock`. Fails silently if denied. */
export function createWakeLockBrowserApi(): TWakeLockApi {
  let sentinel: TWakeLockSentinel | null = null;
  let active = false;

  const acquire = async () => {
    const wl = getWakeLock();
    if (!active || !wl || sentinel) return;
    try {
      sentinel = await wl.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
      });
    } catch {
      // battery saver, permission, or not-visible — ignore.
    }
  };

  const onVisibility = () => {
    if (active && document.visibilityState === 'visible') void acquire();
  };

  return {
    async request() {
      if (!getWakeLock()) return;
      active = true;
      document.addEventListener('visibilitychange', onVisibility);
      await acquire();
    },
    async release() {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        await sentinel?.release();
      } catch {
        // already released — ignore.
      }
      sentinel = null;
    },
  };
}
