/**
 * Keep the screen awake during a game. `request` is idempotent; the browser
 * adapter re-acquires the lock on `visibilitychange` (the OS drops it when the
 * tab is hidden). No-op adapter for tests and unsupported browsers.
 */
export type TWakeLockApi = {
  request(): Promise<void>;
  release(): Promise<void>;
};
