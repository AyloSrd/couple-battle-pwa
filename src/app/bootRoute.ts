/**
 * The new-game flow (Setup → Mode → Difficulty) keeps its choices in memory only
 * (DraftGameProvider + Setup's reducer). A full page load on one of those routes —
 * the service worker's update reload, a manual refresh, iOS relaunching a killed
 * app on its last URL — has lost them, and would reopen on an empty couple-count
 * picker. Boot those routes on Home instead, where Play starts the flow cleanly.
 * Every other route survives a reload on its own (Play resumes from its snapshot).
 */
const MEMORY_ONLY_PATHS = new Set(['/setup', '/mode', '/difficulty']);

/** The hash to boot on instead of `hash`, or `null` to keep it. */
export function bootHash(hash: string): string | null {
  const path = hash.replace(/^#/, '').split(/[?#]/, 1)[0]?.replace(/\/+$/, '') ?? '';
  return MEMORY_ONLY_PATHS.has(path) ? '#/' : null;
}
