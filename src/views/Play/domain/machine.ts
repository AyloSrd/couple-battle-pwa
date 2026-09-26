import type {
  TRoster,
  TMode,
  TGameDifficulty,
  TThemeId,
  TTeam,
} from '@/shared/game/domain/types';
import type { TQuestion } from '@/shared/questions/domain/types';
import type { TGameSnapshot } from '@/shared/save/domain/types';
import { interpolate } from '@/shared/i18n/domain/services';

/**
 * The in-game state machine (ARCHITECTURE's one sanctioned deviation from
 * 1-route-1-view). Every transition is persisted (toSnapshot) so a refresh
 * resumes exactly.
 *
 *  DILEMMA: question → countdown → resolve → … → final (scoreboard at halfway).
 *  FLASH ("sofa sides", à la Les Z'amours): per round, 2 questions SHARED by
 *    every couple. Answerers (player 1 of each couple) sit on one side and the
 *    phone circulates among them, interleaved by question (Q1 for every couple,
 *    then Q2) — sideAnswerers gate → [handoff → secretInput] per slot. Then the
 *    phone crosses to the guessers' side — sideGuessers gate → [guess → judge]
 *    per slot, same interleaving so the table compares answers to one question
 *    back-to-back. Roles swap each round; scoreboard between rounds; final.
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

// Flash ("sofa sides"): each round draws FLASH_SET questions SHARED by every
// couple. Answerers of all couples answer them on one side of the sofa, then
// the phone crosses and guessers guess them back-to-back per question.
export const FLASH_SET = 2;
/** Shared flash block size — independent of the couple count. */
export const FLASH_SHARED_DECK = FLASH_SET * FLASH_ROUNDS;

// Ultime layout: the shared Flash block, then Dilemma 5 shared, then
// Rapid-fire 5 per couple.
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
  // Flash "sofa sides" (also the Ultime flash segment). Cursor = {round, phase,
  // questionIdx, coupleIdx}; slots iterate coupleIdx fastest, then questionIdx.
  //   collect: sideAnswerers (group gate) → [handoff → secretInput] per slot
  //   guess:   sideGuessers  (group gate) → [guess → judge]        per slot
  | ({ kind: 'sideAnswerers'; round: number } & TGameContext)
  | ({ kind: 'handoff'; round: number; questionIdx: number; coupleIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'secretInput'; round: number; questionIdx: number; coupleIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'sideGuessers'; round: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'guess'; round: number; questionIdx: number; coupleIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
  | ({ kind: 'judge'; round: number; questionIdx: number; coupleIdx: number; secretAnswers: TSecretAnswers } & TGameContext)
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

/** Questions per partner per round — the same for standalone Flash and Ultime. */
export function flashSetSize(_mode: TMode): number {
  return FLASH_SET;
}
/** Ultime's Dilemma slice starts right after the shared Flash block. */
export function dilemmaOffset(mode: TMode): number {
  return mode === 'ultime' ? FLASH_SHARED_DECK : 0;
}
export function dilemmaTotal(mode: TMode, deckLength: number): number {
  return mode === 'ultime' ? ULTIME_DILEMMA_COUNT : deckLength;
}
export function rapidOffset(): number {
  return FLASH_SHARED_DECK + ULTIME_DILEMMA_COUNT;
}
/** Dilemma scoreboard is only mid-game for standalone Dilemma (not Ultime). */
export function scoreboardAt(mode: TMode, deckLength: number): number {
  return mode === 'ultime' ? -1 : Math.floor(deckLength / 2);
}

/** Deck index of a round's shared question — identical for every couple. */
export function flashSharedIndex(round: number, questionIdx: number): number {
  return round * FLASH_SET + questionIdx;
}
/** Size of the shared Flash block (both modes). */
export function flashDeckSize(): number {
  return FLASH_SHARED_DECK;
}
export function answererIndex(round: number): 0 | 1 {
  return (round % 2) as 0 | 1;
}

/** Key for a couple's locked answer to a question; every couple's answers for
 *  the round coexist until the guessing phase completes. */
export function answerKey(teamId: string, questionId: number): string {
  return `${teamId}|${questionId}`;
}

/** The slot after (questionIdx, coupleIdx), coupleIdx fastest. `null` = phase done. */
export function nextFlashSlot(
  numCouples: number,
  questionIdx: number,
  coupleIdx: number,
): { questionIdx: number; coupleIdx: number } | null {
  if (coupleIdx + 1 < numCouples) return { questionIdx, coupleIdx: coupleIdx + 1 };
  if (questionIdx + 1 < FLASH_SET) return { questionIdx: questionIdx + 1, coupleIdx: 0 };
  return null;
}

// ---- Question accessors (mode + offset aware) ------------------------------

type TFlashSlotState = Extract<TGameState, { kind: 'handoff' | 'secretInput' | 'guess' | 'judge' }>;

function isFlashSlot(state: TGameState): state is TFlashSlotState {
  return state.kind === 'handoff' || state.kind === 'secretInput' || state.kind === 'guess' || state.kind === 'judge';
}

export function flashQuestion(state: TGameState): TQuestion | undefined {
  if (!isFlashSlot(state)) return undefined;
  return state.deck[flashSharedIndex(state.round, state.questionIdx)];
}
/** The current slot's answerer-locked answer (what the guesser is judged against). */
export function flashTruth(state: TGameState): string | undefined {
  if (!isFlashSlot(state)) return undefined;
  const team = state.roster[state.coupleIdx];
  const q = flashQuestion(state);
  if (!team || !q) return undefined;
  return state.secretAnswers[answerKey(team.teamId, q.id)];
}
export function dilemmaQuestion(state: TGameState): TQuestion | undefined {
  if (state.kind !== 'question' && state.kind !== 'resolve') return undefined;
  return state.deck[dilemmaOffset(state.mode) + state.questionIdx];
}
export function rapidQuestionOf(state: TGameState): TQuestion | undefined {
  if (state.kind !== 'rapidQuestion' && state.kind !== 'rapidCountdown' && state.kind !== 'rapidJudge') return undefined;
  return state.deck[rapidOffset() + state.coupleIdx * ULTIME_RAPID_PER_COUPLE + state.questionIdx];
}

/**
 * Which addressee variant a screen renders:
 *  - `you`  — the person answering about themselves (V-SecretAnswers).
 *  - `name` — the partner/table guessing about the answerer (V-GuessReveal,
 *    V-Judge, rapid-fire), with `{name}` filled from the roster.
 * `who_of_two` prompts are identical group phrasings, so either variant works.
 */
export type TAddressee = 'you' | 'name';

/** Render a question for a screen role. Uses the i18n interpolation helper so
 *  `{name}` is filled exactly as string templates are. */
export function questionText(
  question: TQuestion | undefined,
  addressee: TAddressee,
  answererName = '',
): string {
  if (!question) return '';
  if (addressee === 'you') return question.you;
  return interpolate(question.name, { name: answererName });
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
    return { kind: 'sideAnswerers', round: 0, ...ctx };
  }
  return { kind: 'question', questionIdx: 0, ...ctx };
}

// ---- Ultime segment routing ------------------------------------------------

/** Where Ultime goes after finishing `completedRound` (called from a scoreboard). */
function ultimeNextAfterRound(ctx: TGameContext, completedRound: number): TGameState {
  if (completedRound === ULTIME_ROUND_FLASH_0) return { kind: 'sideAnswerers', round: 1, ...ctx };
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

/**
 * The answering slot for (questionIdx, coupleIdx). With several couples the
 * phone circulates within the answerers' group, so a LIGHT handoff names who's
 * next; solo has nobody to hand to and goes straight to the input.
 */
function collectSlot(
  ctx: TGameContext,
  round: number,
  slot: { questionIdx: number; coupleIdx: number },
  secretAnswers: TSecretAnswers,
): TGameState {
  const kind = ctx.roster.length > 1 ? 'handoff' : 'secretInput';
  return { kind, round, questionIdx: slot.questionIdx, coupleIdx: slot.coupleIdx, secretAnswers, ...ctx };
}

function withoutKey(answers: TSecretAnswers, key: string): TSecretAnswers {
  const { [key]: _dropped, ...rest } = answers;
  return rest;
}

/** Score the judged slot (judge AND autoGuess both land here), then advance. */
function scoreAndAdvanceGuess(
  ctx: TGameContext,
  round: number,
  questionIdx: number,
  coupleIdx: number,
  secretAnswers: TSecretAnswers,
  points: number,
): TGameState {
  const team = ctx.roster[coupleIdx];
  const next = addScore(ctx, team?.teamId, points);
  // The judged slot's secret has served its purpose: drop it from the next
  // state (and so from the persisted snapshot) instead of keeping it until the
  // round ends. Copy — never mutate the incoming map.
  const q = ctx.deck[flashSharedIndex(round, questionIdx)];
  const remaining = team && q ? withoutKey(secretAnswers, answerKey(team.teamId, q.id)) : secretAnswers;
  const slot = nextFlashSlot(ctx.roster.length, questionIdx, coupleIdx);
  if (slot) return { kind: 'guess', round, questionIdx: slot.questionIdx, coupleIdx: slot.coupleIdx, secretAnswers: remaining, ...next };
  return finishFlashRound(next, round);
}

/** Guessing phase done: the round's locked answers are dropped here. */
function finishFlashRound(ctx: TGameContext, round: number): TGameState {
  // scoreboard between rounds (both modes)…
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

    // ---- Flash: collect phase (answerers' side holds the phone) ----
    case 'sideAnswerers':
      if (event.type === 'passConfirm') {
        return collectSlot(contextOf(state), state.round, { questionIdx: 0, coupleIdx: 0 }, {});
      }
      return state;

    case 'handoff':
      if (event.type === 'passConfirm') {
        return { ...state, kind: 'secretInput' };
      }
      return state;

    case 'secretInput': {
      if (event.type !== 'lockAnswer') return state;
      const q = flashQuestion(state);
      const team = state.roster[state.coupleIdx];
      const secretAnswers: TSecretAnswers =
        q && team ? { ...state.secretAnswers, [answerKey(team.teamId, q.id)]: event.answer } : state.secretAnswers;
      const slot = nextFlashSlot(state.roster.length, state.questionIdx, state.coupleIdx);
      if (slot) return collectSlot(contextOf(state), state.round, slot, secretAnswers);
      // every answerer has answered every shared question → phone crosses the sofa
      return { kind: 'sideGuessers', round: state.round, secretAnswers, ...contextOf(state) };
    }

    // ---- Flash: guess phase (phone on the table, everyone watching) ----
    case 'sideGuessers':
      if (event.type === 'passConfirm') {
        return { kind: 'guess', round: state.round, questionIdx: 0, coupleIdx: 0, secretAnswers: state.secretAnswers, ...contextOf(state) };
      }
      return state;

    case 'guess': {
      const ctx = contextOf(state);
      if (event.type === 'reveal') {
        return { ...state, kind: 'judge' };
      }
      if (event.type === 'autoGuess') {
        const truth = flashTruth(state);
        const points = truth !== undefined && event.guess === truth ? FLASH_EXACT_POINTS : 0;
        return scoreAndAdvanceGuess(ctx, state.round, state.questionIdx, state.coupleIdx, state.secretAnswers, points);
      }
      return state;
    }

    case 'judge': {
      if (event.type !== 'judge') return state;
      const points = event.verdict === 'exact' ? FLASH_EXACT_POINTS : event.verdict === 'close' ? FLASH_CLOSE_POINTS : 0;
      return scoreAndAdvanceGuess(contextOf(state), state.round, state.questionIdx, state.coupleIdx, state.secretAnswers, points);
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
        if (state.mode === 'flash') return { kind: 'sideAnswerers', round: state.round + 1, ...ctx };
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

export function toSnapshot(state: TGameState, now: number = Date.now()): TGameSnapshot {
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
    savedAt: now,
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
    case 'sideAnswerers':
      return { kind: 'sideAnswerers', round, ...ctx };
    case 'handoff':
      return { kind: 'handoff', round, questionIdx, coupleIdx, secretAnswers, ...ctx };
    case 'secretInput':
      return { kind: 'secretInput', round, questionIdx, coupleIdx, secretAnswers, ...ctx };
    case 'sideGuessers':
      return { kind: 'sideGuessers', round, secretAnswers, ...ctx };
    case 'guess':
      return { kind: 'guess', round, questionIdx, coupleIdx, secretAnswers, ...ctx };
    case 'judge':
      return { kind: 'judge', round, questionIdx, coupleIdx, secretAnswers, ...ctx };
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
