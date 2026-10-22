import type { THistoryEntry, TStage } from './machine';

/** One scored question as a heart: full = every point, half = some, empty = none. */
export type THeart = 'full' | 'half' | 'empty';

export type TStageTotal = { earned: number; possible: number };
export type TStageStat = TStageTotal & { stage: TStage };
export type TFlashRoundStat = TStageTotal & { round: number };

export type TTeamStats = {
  teamId: string;
  earned: number;
  possible: number;
  /** earned / possible as an integer 0–100 (0 when nothing was scored). */
  syncPct: number;
  /** Only the stages that occurred, in play order (flash, dilemma, rapid). */
  byStage: TStageStat[];
  /** Flash only, per round — standalone Flash has no other stage to compare. */
  flashRounds: TFlashRoundStat[];
  /** One heart per scored question, in play order. */
  hearts: THeart[];
};

const STAGE_ORDER: readonly TStage[] = ['flash', 'dilemma', 'rapid'];

export function heartOf(entry: Pick<THistoryEntry, 'points' | 'max'>): THeart {
  if (entry.points <= 0) return 'empty';
  return entry.points >= entry.max ? 'full' : 'half';
}

function add(total: TStageTotal | undefined, entry: THistoryEntry): TStageTotal {
  return {
    earned: (total?.earned ?? 0) + entry.points,
    possible: (total?.possible ?? 0) + entry.max,
  };
}

/** Everything the final screen charts for one team, from the game history. */
export function teamStats(history: readonly THistoryEntry[], teamId: string): TTeamStats {
  const mine = history.filter((h) => h.teamId === teamId);
  const stages = new Map<TStage, TStageTotal>();
  const rounds = new Map<number, TStageTotal>();
  let earned = 0;
  let possible = 0;
  for (const entry of mine) {
    earned += entry.points;
    possible += entry.max;
    stages.set(entry.stage, add(stages.get(entry.stage), entry));
    if (entry.stage === 'flash') rounds.set(entry.round, add(rounds.get(entry.round), entry));
  }
  return {
    teamId,
    earned,
    possible,
    syncPct: possible === 0 ? 0 : Math.round((earned / possible) * 100),
    byStage: STAGE_ORDER.flatMap((stage) => {
      const total = stages.get(stage);
      return total ? [{ stage, ...total }] : [];
    }),
    flashRounds: [...rounds.entries()].sort(([a], [b]) => a - b).map(([round, total]) => ({ round, ...total })),
    hearts: mine.map(heartOf),
  };
}

/** Stats for every team of the roster, in roster order (teams with no entry get zeros). */
export function gameStats(history: readonly THistoryEntry[], teamIds: readonly string[]): TTeamStats[] {
  return teamIds.map((id) => teamStats(history, id));
}
