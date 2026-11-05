/**
 * Zero-width characters and bidi controls: invisible in a name or answer, but they make two
 * identical-looking strings differ (or reorder what is shown). Plus the C0/C1 control chars.
 */
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;

/**
 * The one way user text enters the game (player names, typed secret answers): Unicode NFC,
 * invisible / bidi control characters removed, trimmed, then cut to `max` characters (code
 * points, so an emoji is never split in half).
 */
export function normalizeText(raw: string, max: number): string {
  const clean = raw.normalize('NFC').replace(INVISIBLE, '').trim();
  return Array.from(clean).slice(0, max).join('').trim();
}
