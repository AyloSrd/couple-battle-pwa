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
 * 1-route-1-view). PHASE 1: a minimal shell — a single fake question then the
 * final — that proves the loop (init → reduce → snapshot → resume). Phases 2–4
 * grow the state union per mode; the shell (persist every transition, resume
 * from snapshot) stays.
 */

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
  | ({ kind: 'final' } & TGameContext);

export type TGameEvent =
  | { type: 'award'; teamId: string; points: number }
  | { type: 'finish' };

export type TGameConfig = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
};

/** Fresh game: everyone at zero, first question. */
export function initGame(config: TGameConfig): TGameState {
  const scores: Record<string, number> = {};
  for (const team of config.roster) scores[team.teamId] = 0;
  return { kind: 'question', questionIdx: 0, ...config, scores };
}

/** Pure transition. Unknown transitions return the state unchanged. */
export function reduce(state: TGameState, event: TGameEvent): TGameState {
  switch (state.kind) {
    case 'question': {
      if (event.type === 'award') {
        return {
          ...state,
          scores: {
            ...state.scores,
            [event.teamId]: (state.scores[event.teamId] ?? 0) + event.points,
          },
        };
      }
      if (event.type === 'finish') {
        const { kind: _kind, questionIdx: _questionIdx, ...ctx } = state;
        return { kind: 'final', ...ctx };
      }
      return state;
    }
    case 'final':
      return state;
  }
}

/** Serialize machine state to the persisted snapshot. */
export function toSnapshot(state: TGameState): TGameSnapshot {
  return {
    roster: state.roster,
    mode: state.mode,
    difficulty: state.difficulty,
    themes: state.themes,
    deck: state.deck,
    cursor: {
      phase: state.kind,
      round: 0,
      coupleIdx: 0,
      questionIdx: state.kind === 'question' ? state.questionIdx : 0,
    },
    scores: state.scores,
    secretAnswers: {},
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
  if (snapshot.cursor.phase === 'final') {
    return { kind: 'final', ...ctx };
  }
  return { kind: 'question', questionIdx: snapshot.cursor.questionIdx, ...ctx };
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
