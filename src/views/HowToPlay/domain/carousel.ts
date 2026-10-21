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

/**
 * Slide to go to for a key press, or `null` when the key is not a carousel key
 * (or the move would not change the slide). Arrow keys step, Home/End jump.
 */
export function indexFromKey(key: string, current: number, total: number): number | null {
  let target: number;
  switch (key) {
    case 'ArrowRight':
      target = current + 1;
      break;
    case 'ArrowLeft':
      target = current - 1;
      break;
    case 'Home':
      target = 0;
      break;
    case 'End':
      target = total - 1;
      break;
    default:
      return null;
  }
  const next = clampIndex(target, total);
  return next === current ? null : next;
}
