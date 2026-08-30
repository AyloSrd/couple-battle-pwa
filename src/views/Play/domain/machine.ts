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
 * resumes exactly. Two modes are implemented:
 *
 *  DILEMMA: question → countdown → resolve (couples self-confirm) → … → final,
 *    with a scoreboard at the halfway question.
 *  FLASH: per couple, per round — passSecret → secretInput ×3 → passBack →
 *    guess/judge ×3 → next couple; roles swap in round 2; one scoreboard
 *    between the two rounds; then final. Locked secret answers are never
 *    reachable again (no back path; survive refresh in the snapshot).
 */

export type TResult = 'match' | 'miss';
export type TResolveResults = Record<string, TResult>;
export type TVerdict = 'exact' | 'close' | 'miss';

export const DILEMMA_MATCH_POINTS = 1;
export const FLASH_EXACT_POINTS = 2;
export const FLASH_CLOSE_POINTS = 1;
export const FLASH_SET = 3; // questions per answerer per round
export const FLASH_ROUNDS = 2;

/** Fixed across a game; the parts that also live in the snapshot. */
export type TGameContext = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
  scores: Record<string, number>;
};

/** Secret answers locked by the current answerer, keyed by question id (string). */
export type TSecretAnswers = Record<string, string>;

export type TGameState =
  // --- Dilemma ---
  | ({ kind: 'question'; questionIdx: number } & TGameContext)
  | ({ kind: 'countdown'; questionIdx: number } & TGameContext)
  | ({ kind: 'resolve'; questionIdx: number; coupleIdx: number; results: TResolveResults } & TGameContext)
  // --- Flash ---
  | ({ kind: 'passSecret'; round: number; coupleIdx: number } & TGameContext)
  | ({ kind: 'secretInput'; round: number; coupleIdx: number; questionIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'passBack'; round: number; coupleIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'guess'; round: number; coupleIdx: number; questionIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'judge'; round: number; coupleIdx: number; questionIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  // --- Shared ---
  | ({ kind: 'scoreboard'; round: number; questionIdx: number } & TGameContext)
  | ({ kind: 'final' } & TGameContext);

export type TGameEvent =
  // Dilemma
  | { type: 'ready' }
  | { type: 'countdownDone' }
  | { type: 'confirm'; result: TResult }
  // Flash
  | { type: 'passConfirm' }
  | { type: 'lockAnswer'; answer: string }
  | { type: 'reveal' }
  | { type: 'autoGuess'; guess: string }
  | { type: 'judge'; verdict: TVerdict }
  // Shared
  | { type: 'next' };

export type TGameConfig = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
};

/** The scoreboard shows once, at the halfway question (Dilemma). */
export function scoreboardAt(deckLength: number): number {
  return Math.floor(deckLength / 2);
}

/** Deck index for a Flash question. */
export function flashDeckIndex(numCouples: number, round: number, coupleIdx: number, questionIdx: number): number {
  return (round * numCouples + coupleIdx) * FLASH_SET + questionIdx;
}

/** Total Flash deck size (couples × rounds × set). */
export function flashDeckSize(numCouples: number): number {
  return numCouples * FLASH_ROUNDS * FLASH_SET;
}

/** Which player answers this round (the other guesses). Roles swap each round. */
export function answererIndex(round: number): 0 | 1 {
  return (round % 2) as 0 | 1;
}

function contextOf(state: TGameState): TGameContext {
  const { roster, mode, difficulty, themes, deck, scores } = state;
  return { roster, mode, difficulty, themes, deck, scores };
}

/** Fresh game — first state depends on mode. */
export function initGame(config: TGameConfig): TGameState {
  const scores: Record<string, number> = {};
  for (const team of config.roster) scores[team.teamId] = 0;
  const ctx = { ...config, scores };
  if (config.mode === 'flash') {
    return { kind: 'passSecret', round: 0, coupleIdx: 0, ...ctx };
  }
  return { kind: 'question', questionIdx: 0, ...ctx };
}

// ---- Dilemma helpers --------------------------------------------------------

function afterResolve(ctx: TGameContext, questionIdx: number): TGameState {
  const answered = questionIdx + 1;
  if (answered >= ctx.deck.length) return { kind: 'final', ...ctx };
  if (answered === scoreboardAt(ctx.deck.length)) {
    return { kind: 'scoreboard', round: 0, questionIdx: answered, ...ctx };
  }
  return { kind: 'question', questionIdx: answered, ...ctx };
}

// ---- Flash helpers ----------------------------------------------------------

/** The deck question a Flash state is currently on. */
export function flashQuestion(state: TGameState): TQuestion | undefined {
  if (state.kind !== 'secretInput' && state.kind !== 'guess' && state.kind !== 'judge') return undefined;
  const idx = flashDeckIndex(state.roster.length, state.round, state.coupleIdx, state.questionIdx);
  return state.deck[idx];
}

/** Award Flash points to the couple being guessed, then advance the guess set. */
function scoreAndAdvanceGuess(
  ctx: TGameContext,
  round: number,
  coupleIdx: number,
  questionIdx: number,
  secretAnswers: TSecretAnswers,
  points: number,
): TGameState {
  const team = ctx.roster[coupleIdx];
  const scores = team ? { ...ctx.scores, [team.teamId]: (ctx.scores[team.teamId] ?? 0) + points } : ctx.scores;
  const next = { ...ctx, scores };
  const nextQ = questionIdx + 1;
  if (nextQ < FLASH_SET) {
    return { kind: 'guess', round, coupleIdx, questionIdx: nextQ, secretAnswers, ...next };
  }
  return advanceFlashCouple(next, round, coupleIdx);
}

/** After a couple finishes its guess set: next couple, else next round / scoreboard / final. */
function advanceFlashCouple(ctx: TGameContext, round: number, coupleIdx: number): TGameState {
  const nextCouple = coupleIdx + 1;
  if (nextCouple < ctx.roster.length) {
    return { kind: 'passSecret', round, coupleIdx: nextCouple, ...ctx };
  }
  if (round + 1 < FLASH_ROUNDS) {
    return { kind: 'scoreboard', round, questionIdx: 0, ...ctx }; // one stop between rounds
  }
  return { kind: 'final', ...ctx };
}

// ---- Reducer ----------------------------------------------------------------

/** Pure transition. Unknown transitions return the state unchanged. */
export function reduce(state: TGameState, event: TGameEvent): TGameState {
  switch (state.kind) {
    // --- Dilemma ---
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

    // --- Flash ---
    case 'passSecret':
      if (event.type === 'passConfirm') {
        return { kind: 'secretInput', round: state.round, coupleIdx: state.coupleIdx, questionIdx: 0, secretAnswers: {}, ...contextOf(state) };
      }
      return state;

    case 'secretInput': {
      if (event.type !== 'lockAnswer') return state;
      const q = flashQuestion(state);
      const secretAnswers: TSecretAnswers = q
        ? { ...state.secretAnswers, [String(q.id)]: event.answer }
        : state.secretAnswers;
      const nextQ = state.questionIdx + 1;
      if (nextQ < FLASH_SET) {
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

    // --- Shared ---
    case 'scoreboard':
      if (event.type === 'next') {
        if (state.mode === 'flash') {
          return { kind: 'passSecret', round: state.round + 1, coupleIdx: 0, ...contextOf(state) };
        }
        return { kind: 'question', questionIdx: state.questionIdx, ...contextOf(state) };
      }
      return state;

    case 'final':
      return state;
  }
}

// ---- Views helpers ----------------------------------------------------------

/** The active couple during Dilemma resolve (or undefined). */
export function activeCouple(state: TGameState): TTeam | undefined {
  return state.kind === 'resolve' ? state.roster[state.coupleIdx] : undefined;
}

// ---- Snapshot ---------------------------------------------------------------

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
    // Dilemma
    case 'resolve':
      return { kind: 'resolve', questionIdx, coupleIdx, results: snapshot.confirmed, ...ctx };
    case 'countdown': // a mid-countdown refresh re-shows the question
    case 'question':
      return { kind: 'question', questionIdx, ...ctx };
    // Flash
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
    default:
      // Unknown phase → safest is the mode's opening state.
      return initGame({ roster: ctx.roster, mode: ctx.mode, difficulty: ctx.difficulty, themes: ctx.themes, deck: ctx.deck });
  }
}

export type TRankedTeam = { team: TTeam; score: number; isWinner: boolean };

/** Teams sorted by score (desc). Ties share the crown (no tie-breaker). */
export function rankTeams(state: TGameContext): TRankedTeam[] {
  const scored = state.roster.map((team) => ({ team, score: state.scores[team.teamId] ?? 0 }));
  const max = scored.reduce((m, s) => Math.max(m, s.score), 0);
  return scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s, isWinner: s.score === max }));
}
