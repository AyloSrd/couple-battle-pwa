import { useEffect } from 'react';

type TSentinel = { release(): Promise<void>; addEventListener(type: 'release', listener: () => void): void };
type TWakeLock = { request(type: 'screen'): Promise<TSentinel> };

/**
 * Keep the screen awake while the calling screen (Play) is mounted; silent where denied or
 * unsupported (iOS < 16.4, jsdom). Each mount owns its lock: one request in flight, re-acquired
 * when the page is visible again (the browser drops it when hidden), and a lock granted after
 * unmount is released on arrival — never held with nobody left to free it.
 */
export function useKeepAwake(): void {
  useEffect(() => {
    const wakeLock = (navigator as { wakeLock?: TWakeLock }).wakeLock;
    if (!wakeLock) return;
    let mounted = true;
    let pending = false;
    let sentinel: TSentinel | null = null;
    const acquire = async () => {
      if (pending || sentinel) return;
      pending = true;
      try {
        const s = await wakeLock.request('screen');
        if (!mounted) {
          await s.release();
          return;
        }
        sentinel = s;
        s.addEventListener('release', () => {
          if (sentinel === s) sentinel = null;
        });
      } catch {
        // battery saver, permission, not visible: stay asleep-able
      } finally {
        pending = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    void acquire();
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, []);
}
