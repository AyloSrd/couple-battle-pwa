/**
 * Team character art, resolved BY TEAM ID from whatever files exist under
 * src/assets/art/. Naming contract: `team-{id}-idle-{512|768}.webp`. Adding a
 * couple is a file drop — no code change. Teams without art fall back to the
 * placeholder tile (tinted square + team initial) in the components.
 */
const FILES = import.meta.glob('/src/assets/art/team-*-idle-*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ART = new Map<string, string>(); // "id:size" → url
for (const [path, url] of Object.entries(FILES)) {
  const m = /team-([a-z0-9]+)-idle-(\d+)\.webp$/.exec(path);
  if (m) ART.set(`${m[1]}:${m[2]}`, url);
}

export type TTeamArtSize = 512 | 768;

/** URL of a team's idle render at `size`, the other size if only that exists, else undefined. */
export function teamArtUrl(teamId: string, size: TTeamArtSize): string | undefined {
  return ART.get(`${teamId}:${size}`) ?? ART.get(`${teamId}:${size === 768 ? 512 : 768}`);
}

/** Ids that have any art shipped (for tests / preloading). */
export function teamsWithArt(): string[] {
  return Array.from(new Set(Array.from(ART.keys()).map((k) => k.split(':')[0] ?? '')));
}
