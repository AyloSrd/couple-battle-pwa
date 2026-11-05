import { FLASH_SET, segmentOf, type TGameCtx } from '@/shared/game';
import type { TGameAt } from './machine';

/**
 * Pure helpers for the UI beats (countdown length, scoreboard tally). Nothing here changes the
 * rules: they read the game the machine produced.
 */

/** GF6: the full 3-2-1 opens a Dilemma block — a segment's first question, and the first one
 *  after the halfway board (play resumed after a break); the questions in between get 2-1. */
export function countdownTicks(game: TGameAt<'ask'>): 3 | 2 {
  const segment = segmentOf(game.ctx);
  const { q } = game.step;
  if (q === 0 || segment?.kind !== 'dilemma') return 3;
  const half = Math.floor(segment.count / 2);
  return segment.halfway && half > 0 && q === half ? 3 : 2;
}

/** How many scored entries (one per couple per question) the block before this board added. */
export function boardBlockLength(game: TGameAt<'scoreboard'>): number {
  const segment = segmentOf(game.ctx);
  const couples = game.ctx.roster.length;
  if (!segment) return 0;
  // the halfway board closes the first half; the one after a Dilemma closes the rest
  if (game.step.resumeQ !== undefined) return game.step.resumeQ * couples;
  switch (segment.kind) {
    case 'flash':
      return FLASH_SET * couples;
    case 'dilemma': {
      const half = Math.floor(segment.count / 2);
      return (segment.halfway && half > 0 ? segment.count - half : segment.count) * couples;
    }
    case 'rapid':
      return segment.perCouple * couples;
  }
}

/**
 * Each team's total at the previous board: today's scores minus the last `entries` history
 * entries. `null` when the history cannot tell (a game resumed from a snapshot older than the
 * history): it must add up to the scores, team by team.
 */
export function previousScores(ctx: Pick<TGameCtx, 'roster' | 'scores' | 'history'>, entries: number): Record<string, number> | null {
  const { roster, scores, history } = ctx;
  if (entries > history.length) return null;
  const sum = (list: typeof history, teamId: string) => list.reduce((n, e) => (e.teamId === teamId ? n + e.points : n), 0);
  const recent = history.slice(history.length - entries);
  const previous: Record<string, number> = {};
  for (const team of roster) {
    const score = scores[team.teamId] ?? 0;
    if (sum(history, team.teamId) !== score) return null;
    previous[team.teamId] = score - sum(recent, team.teamId);
  }
  return previous;
}

/** Shown value of a count-up `from` → `to` after `k` steps of one point. */
export function countedValue(from: number, to: number, k: number): number {
  return Math.min(to, from + k);
}
