/**
 * Auto-reload an open tab when a freshly deployed service worker takes control,
 * so long-lived tabs stop running stale code after a deploy.
 *
 * Workbox already content-hashes assets (it only re-downloads what changed); this
 * just makes the running page adopt the new version. Guarded two ways:
 *  - only armed when a controller already exists at load (so it never fires on
 *    the very first visit, where clientsClaim triggers the initial control), and
 *  - a `refreshing` latch so it reloads at most once.
 * The intro is gated per session, so the reload lands straight on Home (and an
 * in-progress game resumes from its snapshot) — no birthday replay.
 */
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  if (navigator.serviceWorker.controller) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}
