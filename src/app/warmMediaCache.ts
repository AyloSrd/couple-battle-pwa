/**
 * Warm the service worker's runtime media cache with one full (non-range) GET.
 * The player only issues range requests (206), which the `cb-media` CacheFirst route
 * does not store (it caches 200s), so without this the video would never be cached
 * and an offline cold start would have nothing to play. Same origin only; every
 * failure (offline, blocked) is swallowed — it is an optimisation, never a dependency.
 * Skipped while no service worker controls the page (first visit): the request would
 * bypass the cache and just download the clip a second time.
 */
export async function warmMediaCache(url: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
  try {
    const res = await fetch(url);
    // Drain the body so the service worker's cache write can complete.
    if (res.ok) await res.arrayBuffer();
  } catch {
    // offline / blocked — the splash simply skips next time too.
  }
}
