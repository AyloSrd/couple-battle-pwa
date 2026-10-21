import type { TRankedTeam } from './machine';

/** Who tops the final ranking: one team, or several sharing the best score. */
export type TOutcome =
  | { kind: 'winner'; winner: TRankedTeam }
  | { kind: 'tie'; teams: TRankedTeam[]; score: number };

/**
 * Resolve the outcome from the ranked scores. A tie means 2+ teams share the top
 * score — including every team at 0-0. A single team (solo) is always the winner.
 * Returns null for an empty ranking.
 */
export function resolveOutcome(ranked: readonly TRankedTeam[]): TOutcome | null {
  const first = ranked[0];
  if (!first) return null;
  const top = ranked.reduce((m, r) => Math.max(m, r.score), first.score);
  const teams = ranked.filter((r) => r.score === top);
  const [only] = teams;
  if (teams.length === 1 && only) return { kind: 'winner', winner: only };
  return { kind: 'tie', teams, score: top };
}

/** Locale-aware "A, B & C" list of names (falls back to " & " if Intl.ListFormat is missing). */
export function joinNames(names: readonly string[], locale: string): string {
  if (typeof Intl !== 'undefined' && typeof Intl.ListFormat === 'function') {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
  }
  return names.join(' & ');
}
