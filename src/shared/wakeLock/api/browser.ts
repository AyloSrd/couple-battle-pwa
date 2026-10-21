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

/**
 * Screen wake lock backed by `navigator.wakeLock`. Fails silently if denied.
 *
 * `wl.request` is async, so `release()` (unmount) or a second `acquire`
 * (visibilitychange, StrictMode) can land while a request is in flight.
 * `pending` keeps a single request at a time, and a lock that resolves after
 * `release()` is dropped on arrival — otherwise it would be held with nobody
 * left to free it, keeping the screen awake outside the game.
 */
export function createWakeLockBrowserApi(): TWakeLockApi {
  let sentinel: TWakeLockSentinel | null = null;
  let active = false;
  let pending: Promise<void> | null = null;

  const acquire = (): Promise<void> =>
    (pending ??= (async () => {
      const wl = getWakeLock();
      if (!active || !wl || sentinel) return;
      try {
        const s = await wl.request('screen');
        if (!active) {
          // Not awaited: `pending` must clear in this same tick, so a request()
          // right behind the release starts a fresh acquire instead of reusing us.
          s.release().catch(() => {});
          return;
        }
        sentinel = s;
        s.addEventListener('release', () => {
          if (sentinel === s) sentinel = null;
        });
      } catch {
        // battery saver, permission, or not-visible — ignore.
      }
    })().finally(() => {
      pending = null;
    }));

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
      // Clear before awaiting, so a `request()` right behind us (Play → Home →
      // Resume) acquires a fresh lock instead of seeing the dying one.
      const s = sentinel;
      sentinel = null;
      try {
        await s?.release();
      } catch {
        // already released — ignore.
      }
    },
  };
}
