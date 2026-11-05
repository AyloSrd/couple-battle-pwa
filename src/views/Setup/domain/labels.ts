/**
 * The localized team-pick line ("Duo 2 : choisissez votre équipe") in its two halves: the head
 * ("Duo 2") for chips and the pass screen, the rest for the TEAM step's title. No colon (or an
 * empty half) → the whole line.
 */
export function splitPickLine(full: string): [head: string, title: string] {
  const idx = full.indexOf(':');
  if (idx === -1) return [full, full];
  return [full.slice(0, idx).trim() || full, full.slice(idx + 1).trim()];
}
