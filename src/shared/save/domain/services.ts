import { isGameConsistent, type TGame } from '@/shared/game/domain/game';
import type { TProfile, TSoloResult } from './types';

/** How long an in-progress game stays resumable after its last write. */
export const GAME_MAX_AGE_MS = 12 * 60 * 60 * 1000;
/** Clock-skew tolerance for a game dated in the future. */
export const GAME_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

/**
 * A stored game is stale — and must not be resumed — once older than `GAME_MAX_AGE_MS`, or when
 * it claims to be from further in the future than `GAME_MAX_FUTURE_SKEW_MS` (a tampered or
 * skewed clock). This bounds how long a Flash round's locked secret answers sit on the device.
 */
export function isGameStale(savedAt: number, now: number): boolean {
  return now - savedAt > GAME_MAX_AGE_MS || savedAt > now + GAME_MAX_FUTURE_SKEW_MS;
}

/**
 * What boot does with the game it read:
 * - `finish`: a final game whose profile merge may not have landed (a crash between the two
 *   writes) — replayed FIRST, even when old, since the merge is idempotent;
 * - `stale`: past the resume window — removed without a word (as before the refactor);
 * - `discard`: a deck id missing from the bank (or any other inconsistency) — removed, and the
 *   player is told (never a silent restart, S6);
 * - `resume`: Play mounts on it as-is.
 */
export type TRecovery = 'finish' | 'stale' | 'discard' | 'resume';

export function recoveryOf(
  game: TGame,
  savedAt: number,
  { now, hasQuestion }: { now: number; hasQuestion: (id: number) => boolean },
): TRecovery {
  if (game.step.kind === 'final') return 'finish';
  if (isGameStale(savedAt, now)) return 'stale';
  return isGameConsistent(game, hasQuestion) ? 'resume' : 'discard';
}

/**
 * Fold a finished game into the profile: its deck joins the seen ids, a solo score raises the
 * mode's best. Idempotent (a replay after a crash changes nothing more). `soloResult` is read
 * from the best BEFORE the merge, so the Final screen can say "new best".
 */
export function mergeFinish(profile: TProfile, final: TGame): { profile: TProfile; soloResult: TSoloResult | null } {
  const { ctx } = final;
  const seenIds = [...new Set([...profile.seenIds, ...ctx.deck.map((card) => card.id)])];
  const solo = ctx.roster.length === 1 ? ctx.roster[0] : undefined;
  if (!solo) return { profile: { ...profile, seenIds }, soloResult: null };

  const points = ctx.scores[solo.teamId] ?? 0;
  const previous = profile.soloBest[ctx.mode];
  const best = Math.max(previous, points);
  return {
    profile: { ...profile, seenIds, soloBest: { ...profile.soloBest, [ctx.mode]: best } },
    soloResult: { isBest: points > previous, points, best },
  };
}
