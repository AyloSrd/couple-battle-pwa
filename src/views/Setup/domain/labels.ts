/**
 * The localized team-pick line ("Duo 2 : choisissez votre équipe") is shown in two halves:
 * the head ("Duo 2") on chips and the pass screen, the rest as the TEAM step's title.
 */

/** "Duo {n}" — the line up to its colon (the whole line when there is none). */
export function duoLabel(full: string): string {
  const head = full.split(':')[0]?.trim();
  return head && head !== full ? head : full;
}

/** The title: the line after its "Duo n :" head (the whole line when there is none). */
export function pickTitle(full: string): string {
  const idx = full.indexOf(':');
  return idx === -1 ? full : full.slice(idx + 1).trim();
}
