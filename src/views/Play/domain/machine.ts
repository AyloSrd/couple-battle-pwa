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
 * 1-route-1-view). Every transition is persisted (toSnapshot) so a refresh
 * resumes exactly.
 *
 *  DILEMMA: question → countdown → resolve → … → final (scoreboard at halfway).
 *  FLASH: per couple/round — passSecret → secretInput ×N → passBack →
 *    guess/judge ×N; roles swap each round; scoreboard between rounds; final.
 *  ULTIME: a COMPOSITION that reuses the Flash and Dilemma flows as segments,
 *    driven by a single `round` counter, then a rapid-fire finale:
 *      round 0 = Flash r0 (2 q/partner) → round 1 = Flash r1 → round 2 =
 *      Dilemma (5) → round 3 = rapid-fire (5/couple) → final, with a scoreboard
 *      between each round. Flash set size and the Dilemma slice are parameters,
 *      not duplicated logic.
 */

export type TResult = 'match' | 'miss';
export type TResolveResults = Record<string, TResult>;
export type TVerdict = 'exact' | 'close' | 'miss';

export const DILEMMA_MATCH_POINTS = 1;
export const FLASH_EXACT_POINTS = 2;
export const FLASH_CLOSE_POINTS = 1;
export const RAPID_SYNCHRO_POINTS = 2;
export const FLASH_ROUNDS = 2;

// Ultime layout (per couple): Flash 2 q/partner × 2 rounds, Dilemma 5 shared,
// Rapid-fire 5 per couple.
export const ULTIME_FLASH_SET = 2;
export const FLASH_SET_STANDALONE = 3;
export const ULTIME_DILEMMA_COUNT = 5;
export const ULTIME_RAPID_PER_COUPLE = 5;

export const ULTIME_ROUND_FLASH_0 = 0;
export const ULTIME_ROUND_FLASH_1 = 1;
export const ULTIME_ROUND_DILEMMA = 2;
export const ULTIME_ROUND_RAPID = 3;

export type TGameContext = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
  scores: Record<string, number>;
};

export type TSecretAnswers = Record<string, string>;

export type TGameState =
  // Dilemma (also the Ultime dilemma segment)
  | ({ kind: 'question'; questionIdx: number } & TGameContext)
  | ({ kind: 'countdown'; questionIdx: number } & TGameContext)
  | ({ kind: 'resolve'; questionIdx: number; coupleIdx: number; results: TResolveResults } & TGameContext)
  // Flash (also the Ultime flash segment)
  | ({ kind: 'passSecret'; round: number; coupleIdx: number } & TGameContext)
  | ({ kind: 'secretInput'; round: number; coupleIdx: number; questionIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'passBack'; round: number; coupleIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'guess'; round: number; coupleIdx: number; questionIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'judge'; round: number; coupleIdx: number; questionIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  // Rapid-fire (Ultime finale)
  | ({ kind: 'rapidIntro' } & TGameContext)
  | ({ kind: 'rapidTurn'; coupleIdx: number } & TGameContext)
  | ({ kind: 'rapidQuestion'; coupleIdx: number; questionIdx: number } & TGameContext)
  | ({ kind: 'rapidCountdown'; coupleIdx: number; questionIdx: number } & TGameContext)
  | ({ kind: 'rapidJudge'; coupleIdx: number; questionIdx: number } & TGameContext)
  // Shared
  | ({ kind: 'scoreboard'; round: number; questionIdx: number } & TGameContext)
  | ({ kind: 'final' } & TGameContext);

export type TGameEvent =
  | { type: 'ready' }
  | { type: 'countdownDone' }
  | { type: 'confirm'; result: TResult }
  | { type: 'passConfirm' }
  | { type: 'lockAnswer'; answer: string }
  | { type: 'reveal' }
  | { type: 'autoGuess'; guess: string }
  | { type: 'judge'; verdict: TVerdict }
  | { type: 'rapidJudge'; synchro: boolean }
  | { type: 'next' };

export type TGameConfig = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
};

// ---- Parameters ------------------------------------------------------------

export function flashSetSize(mode: TMode): number {
  return mode === 'ultime' ? ULTIME_FLASH_SET : FLASH_SET_STANDALONE;
}
export function dilemmaOffset(mode: TMode, numCouples: number): number {
  return mode === 'ultime' ? ULTIME_FLASH_SET * FLASH_ROUNDS * numCouples : 0;
}
export function dilemmaTotal(mode: TMode, deckLength: number): number {
  return mode === 'ultime' ? ULTIME_DILEMMA_COUNT : deckLength;
}
export function rapidOffset(numCouples: number): number {
  return ULTIME_FLASH_SET * FLASH_ROUNDS * numCouples + ULTIME_DILEMMA_COUNT;
}
/** Dilemma scoreboard is only mid-game for standalone Dilemma (not Ultime). */
export function scoreboardAt(mode: TMode, deckLength: number): number {
  return mode === 'ultime' ? -1 : Math.floor(deckLength / 2);
}

export function flashDeckIndex(numCouples: number, set: number, round: number, coupleIdx: number, questionIdx: number): number {
  return (round * numCouples + coupleIdx) * set + questionIdx;
}
export function flashDeckSize(numCouples: number): number {
  return numCouples * FLASH_ROUNDS * FLASH_SET_STANDALONE;
}
export function answererIndex(round: number): 0 | 1 {
  return (round % 2) as 0 | 1;
}

// ---- Question accessors (mode + offset aware) ------------------------------

export function flashQuestion(state: TGameState): TQuestion | undefined {
  if (state.kind !== 'secretInput' && state.kind !== 'guess' && state.kind !== 'judge') return undefined;
  const idx = flashDeckIndex(state.roster.length, flashSetSize(state.mode), state.round, state.coupleIdx, state.questionIdx);
  return state.deck[idx];
}
export function dilemmaQuestion(state: TGameState): TQuestion | undefined {
  if (state.kind !== 'question' && state.kind !== 'resolve') return undefined;
  return state.deck[dilemmaOffset(state.mode, state.roster.length) + state.questionIdx];
}
export function rapidQuestionOf(state: TGameState): TQuestion | undefined {
  if (state.kind !== 'rapidQuestion' && state.kind !== 'rapidCountdown' && state.kind !== 'rapidJudge') return undefined;
  return state.deck[rapidOffset(state.roster.length) + state.coupleIdx * ULTIME_RAPID_PER_COUPLE + state.questionIdx];
}

function contextOf(state: TGameState): TGameContext {
  const { roster, mode, difficulty, themes, deck, scores } = state;
  return { roster, mode, difficulty, themes, deck, scores };
}
function addScore(ctx: TGameContext, teamId: string | undefined, points: number): TGameContext {
  if (!teamId || points === 0) return ctx;
  return { ...ctx, scores: { ...ctx.scores, [teamId]: (ctx.scores[teamId] ?? 0) + points } };
}

// ---- Init ------------------------------------------------------------------

export function initGame(config: TGameConfig): TGameState {
  const scores: Record<string, number> = {};
  for (const team of config.roster) scores[team.teamId] = 0;
  const ctx = { ...config, scores };
  if (config.mode === 'flash' || config.mode === 'ultime') {
    return { kind: 'passSecret', round: 0, coupleIdx: 0, ...ctx };
  }
  return { kind: 'question', questionIdx: 0, ...ctx };
}

// ---- Ultime segment routing ------------------------------------------------

/** Where Ultime goes after finishing `completedRound` (called from a scoreboard). */
function ultimeNextAfterRound(ctx: TGameContext, completedRound: number): TGameState {
  if (completedRound === ULTIME_ROUND_FLASH_0) return { kind: 'passSecret', round: 1, coupleIdx: 0, ...ctx };
  if (completedRound === ULTIME_ROUND_FLASH_1) return { kind: 'question', questionIdx: 0, ...ctx };
  return { kind: 'rapidIntro', ...ctx }; // after dilemma
}

// ---- Dilemma helpers -------------------------------------------------------

function afterResolve(ctx: TGameContext, questionIdx: number): TGameState {
  const answered = questionIdx + 1;
  const total = dilemmaTotal(ctx.mode, ctx.deck.length);
  if (answered >= total) {
    if (ctx.mode === 'ultime') return { kind: 'scoreboard', round: ULTIME_ROUND_DILEMMA, questionIdx: answered, ...ctx };
    return { kind: 'final', ...ctx };
  }
  if (answered === scoreboardAt(ctx.mode, ctx.deck.length)) {
    return { kind: 'scoreboard', round: 0, questionIdx: answered, ...ctx };
  }
  return { kind: 'question', questionIdx: answered, ...ctx };
}

// ---- Flash helpers ---------------------------------------------------------

function scoreAndAdvanceGuess(
  ctx: TGameContext,
  round: number,
  coupleIdx: number,
  questionIdx: number,
  secretAnswers: TSecretAnswers,
  points: number,
): TGameState {
  const team = ctx.roster[coupleIdx];
  const next = addScore(ctx, team?.teamId, points);
  const nextQ = questionIdx + 1;
  if (nextQ < flashSetSize(ctx.mode)) {
    return { kind: 'guess', round, coupleIdx, questionIdx: nextQ, secretAnswers, ...next };
  }
  return advanceFlashCouple(next, round, coupleIdx);
}

function advanceFlashCouple(ctx: TGameContext, round: number, coupleIdx: number): TGameState {
  const nextCouple = coupleIdx + 1;
  if (nextCouple < ctx.roster.length) {
    return { kind: 'passSecret', round, coupleIdx: nextCouple, ...ctx };
  }
  // round complete → scoreboard between rounds (both modes)…
  if (round + 1 < FLASH_ROUNDS || ctx.mode === 'ultime') {
    return { kind: 'scoreboard', round, questionIdx: 0, ...ctx };
  }
  return { kind: 'final', ...ctx }; // standalone flash after last round
}

// ---- Rapid-fire helpers ----------------------------------------------------

function advanceRapid(ctx: TGameContext, coupleIdx: number, questionIdx: number): TGameState {
  const nextQ = questionIdx + 1;
  if (nextQ < ULTIME_RAPID_PER_COUPLE) return { kind: 'rapidQuestion', coupleIdx, questionIdx: nextQ, ...ctx };
  const nextCouple = coupleIdx + 1;
  if (nextCouple < ctx.roster.length) return { kind: 'rapidTurn', coupleIdx: nextCouple, ...ctx };
  return { kind: 'final', ...ctx };
}

// ---- Reducer ---------------------------------------------------------------

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
      if (!team) return state;
      const results: TResolveResults = { ...state.results, [team.teamId]: event.result };
      const ctx = event.result === 'match' ? addScore(contextOf(state), team.teamId, DILEMMA_MATCH_POINTS) : contextOf(state);
      const nextCoupleIdx = state.coupleIdx + 1;
      if (nextCoupleIdx < state.roster.length) {
        return { kind: 'resolve', questionIdx: state.questionIdx, coupleIdx: nextCoupleIdx, results, ...ctx };
      }
      return afterResolve(ctx, state.questionIdx);
    }

    case 'passSecret':
      if (event.type === 'passConfirm') {
        return { kind: 'secretInput', round: state.round, coupleIdx: state.coupleIdx, questionIdx: 0, secretAnswers: {}, ...contextOf(state) };
      }
      return state;

    case 'secretInput': {
      if (event.type !== 'lockAnswer') return state;
      const q = flashQuestion(state);
      const secretAnswers: TSecretAnswers = q ? { ...state.secretAnswers, [String(q.id)]: event.answer } : state.secretAnswers;
      const nextQ = state.questionIdx + 1;
      if (nextQ < flashSetSize(state.mode)) {
        return { kind: 'secretInput', round: state.round, coupleIdx: state.coupleIdx, questionIdx: nextQ, secretAnswers, ...contextOf(state) };
      }
      return { kind: 'passBack', round: state.round, coupleIdx: state.coupleIdx, secretAnswers, ...contextOf(state) };
    }

    case 'passBack':
      if (event.type === 'passConfirm') {
        return { kind: 'guess', round: state.round, coupleIdx: state.coupleIdx, questionIdx: 0, secretAnswers: state.secretAnswers, ...contextOf(state) };
      }
      return state;

    case 'guess': {
      const ctx = contextOf(state);
      if (event.type === 'reveal') {
        return { kind: 'judge', round: state.round, coupleIdx: state.coupleIdx, questionIdx: state.questionIdx, secretAnswers: state.secretAnswers, ...ctx };
      }
      if (event.type === 'autoGuess') {
        const q = flashQuestion(state);
        const truth = q ? state.secretAnswers[String(q.id)] : undefined;
        const points = truth !== undefined && event.guess === truth ? FLASH_EXACT_POINTS : 0;
        return scoreAndAdvanceGuess(ctx, state.round, state.coupleIdx, state.questionIdx, state.secretAnswers, points);
      }
      return state;
    }

    case 'judge': {
      if (event.type !== 'judge') return state;
      const points = event.verdict === 'exact' ? FLASH_EXACT_POINTS : event.verdict === 'close' ? FLASH_CLOSE_POINTS : 0;
      return scoreAndAdvanceGuess(contextOf(state), state.round, state.coupleIdx, state.questionIdx, state.secretAnswers, points);
    }

    case 'rapidIntro':
      if (event.type === 'next') return { kind: 'rapidTurn', coupleIdx: 0, ...contextOf(state) };
      return state;

    case 'rapidTurn':
      if (event.type === 'next') return { kind: 'rapidQuestion', coupleIdx: state.coupleIdx, questionIdx: 0, ...contextOf(state) };
      return state;

    case 'rapidQuestion':
      if (event.type === 'ready') return { kind: 'rapidCountdown', coupleIdx: state.coupleIdx, questionIdx: state.questionIdx, ...contextOf(state) };
      return state;

    case 'rapidCountdown':
      if (event.type === 'countdownDone') return { kind: 'rapidJudge', coupleIdx: state.coupleIdx, questionIdx: state.questionIdx, ...contextOf(state) };
      return state;

    case 'rapidJudge': {
      if (event.type !== 'rapidJudge') return state;
      const team = state.roster[state.coupleIdx];
      const ctx = event.synchro ? addScore(contextOf(state), team?.teamId, RAPID_SYNCHRO_POINTS) : contextOf(state);
      return advanceRapid(ctx, state.coupleIdx, state.questionIdx);
    }

    case 'scoreboard':
      if (event.type === 'next') {
        const ctx = contextOf(state);
        if (state.mode === 'ultime') return ultimeNextAfterRound(ctx, state.round);
        if (state.mode === 'flash') return { kind: 'passSecret', round: state.round + 1, coupleIdx: 0, ...ctx };
        return { kind: 'question', questionIdx: state.questionIdx, ...ctx };
      }
      return state;

    case 'final':
      return state;
  }
}

// ---- Views helpers ---------------------------------------------------------

export function activeCouple(state: TGameState): TTeam | undefined {
  return state.kind === 'resolve' ? state.roster[state.coupleIdx] : undefined;
}

// ---- Snapshot --------------------------------------------------------------

export function toSnapshot(state: TGameState): TGameSnapshot {
  const questionIdx = 'questionIdx' in state ? state.questionIdx : 0;
  const round = 'round' in state ? state.round : 0;
  const coupleIdx = 'coupleIdx' in state ? state.coupleIdx : 0;
  const secretAnswers = 'secretAnswers' in state ? state.secretAnswers : {};
  return {
    roster: state.roster,
    mode: state.mode,
    difficulty: state.difficulty,
    themes: state.themes,
    deck: state.deck,
    cursor: { phase: state.kind, round, coupleIdx, questionIdx },
    scores: state.scores,
    secretAnswers,
    confirmed: state.kind === 'resolve' ? state.results : {},
  };
}

export function fromSnapshot(snapshot: TGameSnapshot): TGameState {
  const ctx: TGameContext = {
    roster: snapshot.roster,
    mode: snapshot.mode,
    difficulty: snapshot.difficulty,
    themes: snapshot.themes,
    deck: snapshot.deck,
    scores: snapshot.scores,
  };
  const { phase, round, coupleIdx, questionIdx } = snapshot.cursor;
  const secretAnswers = snapshot.secretAnswers;
  switch (phase) {
    case 'final':
      return { kind: 'final', ...ctx };
    case 'scoreboard':
      return { kind: 'scoreboard', round, questionIdx, ...ctx };
    case 'resolve':
      return { kind: 'resolve', questionIdx, coupleIdx, results: snapshot.confirmed, ...ctx };
    case 'countdown':
    case 'question':
      return { kind: 'question', questionIdx, ...ctx };
    case 'passSecret':
      return { kind: 'passSecret', round, coupleIdx, ...ctx };
    case 'secretInput':
      return { kind: 'secretInput', round, coupleIdx, questionIdx, secretAnswers, ...ctx };
    case 'passBack':
      return { kind: 'passBack', round, coupleIdx, secretAnswers, ...ctx };
    case 'guess':
      return { kind: 'guess', round, coupleIdx, questionIdx, secretAnswers, ...ctx };
    case 'judge':
      return { kind: 'judge', round, coupleIdx, questionIdx, secretAnswers, ...ctx };
    case 'rapidIntro':
      return { kind: 'rapidIntro', ...ctx };
    case 'rapidTurn':
      return { kind: 'rapidTurn', coupleIdx, ...ctx };
    case 'rapidQuestion':
    case 'rapidCountdown':
      return { kind: 'rapidQuestion', coupleIdx, questionIdx, ...ctx };
    case 'rapidJudge':
      return { kind: 'rapidJudge', coupleIdx, questionIdx, ...ctx };
    default:
      return initGame({ roster: ctx.roster, mode: ctx.mode, difficulty: ctx.difficulty, themes: ctx.themes, deck: ctx.deck });
  }
}

export type TRankedTeam = { team: TTeam; score: number; isWinner: boolean };

export function rankTeams(state: TGameContext): TRankedTeam[] {
  const scored = state.roster.map((team) => ({ team, score: state.scores[team.teamId] ?? 0 }));
  const max = scored.reduce((m, s) => Math.max(m, s.score), 0);
  return scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s, isWinner: s.score === max }));
}
