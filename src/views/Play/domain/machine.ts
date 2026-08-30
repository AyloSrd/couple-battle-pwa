import type {
  TRoster,
  TMode,
  TGameDifficulty,
  TThemeId,
  TTeam,
} from '@/shared/game/domain/types';
import type { TQuestion } from '@/shared/questions/domain/types';
import type { TGameSnapshot } from '@/shared/save/domain/types';

/**
 * The in-game state machine (ARCHITECTURE's one sanctioned deviation from
 * 1-route-1-view). PHASE 2 implements the DILEMMA loop:
 *
 *   question → countdown (3-2-1) → resolve (each couple self-confirms in turn)
 *   → next question … with a scoreboard at the halfway point and a final at the
 *   end. Every transition is persisted (toSnapshot) so a refresh resumes exactly.
 *
 * Phases 3–4 grow the state union for Flash / Ultime; the shell (persist +
 * resume + wake lock + pause) stays.
 */

export type TResult = 'match' | 'miss';
export type TResolveResults = Record<string, TResult>;

/** Fixed across a game; the parts that also live in the snapshot. */
export type TGameContext = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
  scores: Record<string, number>;
};

export type TGameState =
  | ({ kind: 'question'; questionIdx: number } & TGameContext)
  | ({ kind: 'countdown'; questionIdx: number } & TGameContext)
  | ({
      kind: 'resolve';
      questionIdx: number;
      coupleIdx: number;
      results: TResolveResults;
    } & TGameContext)
  | ({ kind: 'scoreboard'; questionIdx: number } & TGameContext)
  | ({ kind: 'final' } & TGameContext);

export type TGameEvent =
  | { type: 'ready' } // question → countdown
  | { type: 'countdownDone' } // countdown → resolve
  | { type: 'confirm'; result: TResult } // active couple resolves
  | { type: 'next' }; // scoreboard → next question

export type TGameConfig = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
};

/** Points per event (Dilemma). */
export const DILEMMA_MATCH_POINTS = 1;

/** The scoreboard shows once, at the halfway question. */
export function scoreboardAt(deckLength: number): number {
  return Math.floor(deckLength / 2);
}

function contextOf(state: TGameState): TGameContext {
  const { roster, mode, difficulty, themes, deck, scores } = state;
  return { roster, mode, difficulty, themes, deck, scores };
}

/** Fresh game: everyone at zero, first question. */
export function initGame(config: TGameConfig): TGameState {
  const scores: Record<string, number> = {};
  for (const team of config.roster) scores[team.teamId] = 0;
  return { kind: 'question', questionIdx: 0, ...config, scores };
}

/** State after every couple has resolved question `questionIdx`. */
function afterResolve(ctx: TGameContext, questionIdx: number): TGameState {
  const answered = questionIdx + 1;
  if (answered >= ctx.deck.length) return { kind: 'final', ...ctx };
  if (answered === scoreboardAt(ctx.deck.length)) {
    return { kind: 'scoreboard', questionIdx: answered, ...ctx };
  }
  return { kind: 'question', questionIdx: answered, ...ctx };
}

/** Pure transition. Unknown transitions return the state unchanged. */
export function reduce(state: TGameState, event: TGameEvent): TGameState {
  switch (state.kind) {
    case 'question':
      if (event.type === 'ready') return { ...state, kind: 'countdown' };
      return state;

    case 'countdown':
      if (event.type === 'countdownDone') {
        return { kind: 'resolve', questionIdx: state.questionIdx, coupleIdx: 0, results: {}, ...contextOf(state) };
      }
      return state;

    case 'resolve': {
      if (event.type !== 'confirm') return state;
      const team = state.roster[state.coupleIdx];
      if (!team) return state; // guard: no active couple
      const results: TResolveResults = { ...state.results, [team.teamId]: event.result };
      const scores =
        event.result === 'match'
          ? { ...state.scores, [team.teamId]: (state.scores[team.teamId] ?? 0) + DILEMMA_MATCH_POINTS }
          : state.scores;
      const ctx = { ...contextOf(state), scores };
      const nextCoupleIdx = state.coupleIdx + 1;
      if (nextCoupleIdx < state.roster.length) {
        return { kind: 'resolve', questionIdx: state.questionIdx, coupleIdx: nextCoupleIdx, results, ...ctx };
      }
      return afterResolve(ctx, state.questionIdx);
    }

    case 'scoreboard':
      if (event.type === 'next') return { kind: 'question', questionIdx: state.questionIdx, ...contextOf(state) };
      return state;

    case 'final':
      return state;
  }
}

/** The active couple during resolve (or undefined outside it). */
export function activeCouple(state: TGameState): TTeam | undefined {
  return state.kind === 'resolve' ? state.roster[state.coupleIdx] : undefined;
}

/** Serialize machine state to the persisted snapshot. */
export function toSnapshot(state: TGameState): TGameSnapshot {
  const questionIdx = 'questionIdx' in state ? state.questionIdx : 0;
  return {
    roster: state.roster,
    mode: state.mode,
    difficulty: state.difficulty,
    themes: state.themes,
    deck: state.deck,
    cursor: {
      phase: state.kind,
      round: 0,
      coupleIdx: state.kind === 'resolve' ? state.coupleIdx : 0,
      questionIdx,
    },
    scores: state.scores,
    secretAnswers: {},
    confirmed: state.kind === 'resolve' ? state.results : {},
  };
}

/** Rebuild machine state from a snapshot (crash/refresh resume). */
export function fromSnapshot(snapshot: TGameSnapshot): TGameState {
  const ctx: TGameContext = {
    roster: snapshot.roster,
    mode: snapshot.mode,
    difficulty: snapshot.difficulty,
    themes: snapshot.themes,
    deck: snapshot.deck,
    scores: snapshot.scores,
  };
  const { phase, questionIdx, coupleIdx } = snapshot.cursor;
  switch (phase) {
    case 'final':
      return { kind: 'final', ...ctx };
    case 'scoreboard':
      return { kind: 'scoreboard', questionIdx, ...ctx };
    case 'resolve':
      return { kind: 'resolve', questionIdx, coupleIdx, results: snapshot.confirmed, ...ctx };
    // A mid-countdown refresh re-shows the question (the countdown re-runs).
    case 'countdown':
    case 'question':
    default:
      return { kind: 'question', questionIdx, ...ctx };
  }
}

export type TRankedTeam = { team: TTeam; score: number; isWinner: boolean };

/** Teams sorted by score (desc). Ties share the crown (no tie-breaker). */
export function rankTeams(state: TGameContext): TRankedTeam[] {
  const scored = state.roster.map((team) => ({
    team,
    score: state.scores[team.teamId] ?? 0,
  }));
  const max = scored.reduce((m, s) => Math.max(m, s.score), 0);
  return scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s, isWinner: s.score === max }));
}
