/**
 * Zero-width characters and bidi controls: invisible in a name or answer, but they make two
 * identical-looking strings differ (or reorder what is shown). Plus the C0/C1 control chars.
 */
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;

const PICTOGRAPH = /\p{Extended_Pictographic}/u;
/** What may sit between a pictograph and a joiner: VS-16 and skin tones (👍🏽, ❤️). */
const EMOJI_TAIL = /(?:\uFE0F|\p{Emoji_Modifier})+$/u;

/** U+200D glues emoji (👩‍❤️‍👨): kept between two pictographs, stripped anywhere else. */
function isEmojiJoiner(text: string, at: number): boolean {
  const before = Array.from(text.slice(0, at).replace(EMOJI_TAIL, '')).pop() ?? '';
  const after = String.fromCodePoint(text.codePointAt(at + 1) ?? 0);
  return PICTOGRAPH.test(before) && PICTOGRAPH.test(after);
}

/**
 * The one way user text enters the game (player names, typed secret answers): Unicode NFC,
 * invisible / bidi control characters removed, trimmed, then cut to `max` UTF-16 units — the
 * unit Zod's `.max()` counts on decode — never splitting a surrogate pair (an emoji in half).
 */
export function normalizeText(raw: string, max: number): string {
  const text = raw.normalize('NFC');
  const clean = text.replace(INVISIBLE, (ch, at: number) => (ch === '\u200d' && isEmojiJoiner(text, at) ? ch : '')).trim();
  let out = '';
  for (const ch of clean) {
    if (out.length + ch.length > max) break;
    out += ch;
  }
  return out.trim();
}
