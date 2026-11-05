/** Pure helpers for the How-to-play swipe carousel (no DOM, no React). */

/** Keep `index` inside `[0, total - 1]` (0 when the carousel is empty). */
export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}

/** Which slide a scroll-snap track is showing, from its scroll offset and slide width. */
export function indexFromScroll(scrollLeft: number, slideWidth: number, total: number): number {
  if (slideWidth <= 0) return 0;
  return clampIndex(Math.round(scrollLeft / slideWidth), total);
}

/** Arrow keys step, Home/End jump. */
const KEY_TARGET: Record<string, (current: number, total: number) => number> = {
  ArrowRight: (current) => current + 1,
  ArrowLeft: (current) => current - 1,
  Home: () => 0,
  End: (_, total) => total - 1,
};

/** Slide to go to for a key press, or `null` when the key is not a carousel key (or the move would not change the slide). */
export function indexFromKey(key: string, current: number, total: number): number | null {
  const target = Object.hasOwn(KEY_TARGET, key) ? KEY_TARGET[key] : undefined;
  if (!target) return null;
  const next = clampIndex(target(current, total), total);
  return next === current ? null : next;
}
