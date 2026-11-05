/**
 * Team art, resolved BY TEAM ID from the files under src/assets/art/ (adding a couple is a file
 * drop): portrait `team-{id}-{256|384}.webp` (tiles, avatars), full body `team-{id}-full-512.webp`
 * (hero), player bust `team-{id}-p{1|2}-192.webp` (name entry). No art → the placeholder initial.
 */
const FILES = import.meta.glob('/src/assets/art/team-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export type TTeamArtKind = 'portrait' | 'full';
export type TTeamArtSize = 256 | 384 | 512;
export type TPlayerSlot = 1 | 2;

const ART = new Map<string, string>(); // "id:kind:size" → url
const PLAYER_ART = new Map<string, string>(); // "id:slot" → url
for (const [path, url] of Object.entries(FILES)) {
  const match = /team-([a-z0-9]+)-(?:p([12])-192|full-(\d+)|(\d+))\.webp$/.exec(path);
  if (!match) continue;
  const [, id, slot, full, portrait] = match;
  if (slot) PLAYER_ART.set(`${id}:${slot}`, url);
  else ART.set(full ? `${id}:full:${full}` : `${id}:portrait:${portrait}`, url);
}

const SIZES: Record<TTeamArtKind, readonly TTeamArtSize[]> = { portrait: [256, 384], full: [512] };

/** URL of a team's `kind` render at `size`, else the nearest shipped size, else undefined. */
export function teamArtUrl(teamId: string, kind: TTeamArtKind, size?: TTeamArtSize): string | undefined {
  const sizes = SIZES[kind];
  const wanted = size ?? sizes[sizes.length - 1];
  const exact = ART.get(`${teamId}:${kind}:${wanted}`);
  if (exact) return exact;
  for (const s of sizes) {
    const url = ART.get(`${teamId}:${kind}:${s}`);
    if (url) return url;
  }
  return undefined;
}

/** URL of a team's player bust (slot 1 | 2), 192 px wide, else undefined. */
export function playerArtUrl(teamId: string, slot: TPlayerSlot): string | undefined {
  return PLAYER_ART.get(`${teamId}:${slot}`);
}

/** Ids that have a portrait shipped (for tests / preloading). */
export function teamsWithArt(): string[] {
  const ids = Array.from(ART.keys()).filter((k) => k.includes(':portrait:')).map((k) => k.split(':')[0] ?? '');
  return Array.from(new Set(ids));
}
