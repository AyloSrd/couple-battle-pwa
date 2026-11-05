import { useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The player's reduced-motion preference, read once when the screen mounts — for motion
 * driven from JS (count-ups, canvas confetti). CSS animations follow the same media query in
 * `global.css`, so both sides agree. No `matchMedia` (old browsers, jsdom) reads as "no".
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced] = useState(() => {
    try {
      return window.matchMedia(QUERY).matches;
    } catch {
      return false;
    }
  });
  return reduced;
}
