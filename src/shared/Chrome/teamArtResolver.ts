/**
 * Team character art, resolved BY TEAM ID from whatever files exist under
 * src/assets/art/. Naming contract:
 *   portrait (waist-up, square)  `team-{id}-{256|384}.webp`  → tiles, avatars
 *   full body (2:3)              `team-{id}-full-512.webp`   → the hero slot
 *   player bust (square)         `team-{id}-p{1|2}-192.webp` → name-entry avatars
 *                                (p1 / p2 = the couple's two characters, fixed art order)
 * Adding a couple is a file drop — no code change. Teams without art fall back to
 * the placeholder tile (tinted square + team initial) in the components.
 */
const FILES = import.meta.glob('/src/assets/art/team-*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type TTeamArtKind = 'portrait' | 'full';
export type TTeamArtSize = 256 | 384 | 512;
export type TPlayerSlot = 1 | 2;

const ART = new Map<string, string>(); // "id:kind:size" → url
const PLAYER_ART = new Map<string, string>(); // "id:slot" → url
for (const [path, url] of Object.entries(FILES)) {
  const player = /team-([a-z0-9]+)-p([12])-192\.webp$/.exec(path);
  if (player) {
    PLAYER_ART.set(`${player[1]}:${player[2]}`, url);
    continue;
  }
  const full = /team-([a-z0-9]+)-full-(\d+)\.webp$/.exec(path);
  if (full) {
    ART.set(`${full[1]}:full:${full[2]}`, url);
    continue;
  }
  const portrait = /team-([a-z0-9]+)-(\d+)\.webp$/.exec(path);
  if (portrait) ART.set(`${portrait[1]}:portrait:${portrait[2]}`, url);
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
  return Array.from(
    new Set(
      Array.from(ART.keys())
        .filter((k) => k.includes(':portrait:'))
        .map((k) => k.split(':')[0] ?? ''),
    ),
  );
}
