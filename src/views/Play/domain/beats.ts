import { FLASH_SET, segmentOf, type TGameCtx } from '@/shared/game';
import type { TGameAt } from './machine';

// Pure helpers for the UI beats (countdown length, scoreboard tally): they read, never rule.

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

/** Each team's total at the previous board (scores minus the last `entries` entries); `null`
 *  when the history does not add up to the scores (a resumed older snapshot). */
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

/** A count-up `from` → `to` after `k` one-point steps. */
export function countedValue(from: number, to: number, k: number): number {
  return Math.min(to, from + k);
}
