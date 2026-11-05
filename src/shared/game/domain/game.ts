import { z } from 'zod';
import {
  ZModeSchema,
  ZGameDifficultySchema,
  ZThemeIdSchema,
  ZRosterSchema,
  THEME_IDS,
  type TMode,
  type TRoster,
  type TGameDifficulty,
  type TThemeId,
} from './types';
import { ZQuestionTypeSchema, type TQuestionType } from '@/shared/questions/domain/types';

/**
 * The persisted shape of a running game: `{ ctx, step }`. It lives in shared/game (not in
 * views/Play) so the save store can Zod-validate a stored game; the transitions themselves
 * live in `views/Play/domain/machine.ts`.
 */

const ZTeamIdSchema = z.string().regex(/^t[1-4]$/);
export type TTeamId = string;

/** Upper bounds just above what a real game produces (Ultime, 4 couples = 4 + 5 + 4 × 5 = 29
 *  cards), so a tampered record is rejected without ever rejecting a real game. */
export const DECK_MAX = 64;
const HISTORY_MAX = 4 * DECK_MAX;
/** Max length of a typed secret answer (the input's `maxLength`). */
export const SECRET_MAX = 40;
/** Max length of a player name (the Setup inputs' `maxLength`). */
export const NAME_MAX = 16;

// ---- History (moved here from save: the game owns it) ------------------------

/**
 * One scored question, appended on every scoring decision (a zero-point outcome counts). `max`
 * is what the question could have been worth, so the final screen can chart how in sync a team
 * was. `round` is the Flash round (0 | 1); Dilemma and rapid-fire entries use 0.
 */
export const ZHistoryEntrySchema = z
  .object({
    teamId: ZTeamIdSchema,
    stage: z.enum(['flash', 'dilemma', 'rapid']),
    round: z.number().int().min(0).max(3),
    points: z.number().int().min(0).max(9),
    max: z.number().int().min(0).max(9),
  })
  .refine((e) => e.points <= e.max, { message: 'points exceed max' });
export type THistoryEntry = z.infer<typeof ZHistoryEntrySchema>;
export type TStage = THistoryEntry['stage'];

// ---- Plan: the segments a mode plays, in order -------------------------------

export type TSegment =
  | { kind: 'flash'; round: 0 | 1 }
  | { kind: 'dilemma'; from: number; count: number; halfway: boolean }
  | { kind: 'rapid'; from: number; perCouple: number };

/** Questions per Flash round, SHARED by every couple. */
export const FLASH_SET = 2;
const FLASH_0: TSegment = { kind: 'flash', round: 0 };
const FLASH_1: TSegment = { kind: 'flash', round: 1 };
const ULTIME_DILEMMA: TSegment = { kind: 'dilemma', from: 2 * FLASH_SET, count: 5, halfway: false };
const ULTIME_RAPID: TSegment = { kind: 'rapid', from: 2 * FLASH_SET + 5, perCouple: 5 };

/**
 * The segments of a game. A scoreboard follows every segment but the last, plus the Dilemma
 * halfway board (standalone Dilemma only).
 */
export function planOf(mode: TMode, deckLength: number): TSegment[] {
  switch (mode) {
    case 'flash':
      return [FLASH_0, FLASH_1];
    case 'dilemma':
      return [{ kind: 'dilemma', from: 0, count: deckLength, halfway: true }];
    case 'ultime':
      return [FLASH_0, FLASH_1, ULTIME_DILEMMA, ULTIME_RAPID];
  }
}

/** Points per verdict. Dilemma `exact` = the couple matched; rapid `exact` = synchro. */
export const POINTS = {
  dilemma: { exact: 1, miss: 0 },
  flash: { exact: 2, close: 1, miss: 0 },
  rapid: { exact: 2, miss: 0 },
} as const;

/** Flash: player index (in `team.players`) who answers in a round; the partner guesses. */
export function answererIndex(round: number): 0 | 1 {
  return (round % 2) as 0 | 1;
}

/** Key of a couple's locked answer to a question, inside a Flash step's `secrets`. */
export function answerKey(teamId: string, questionId: number): string {
  return `${teamId}|${questionId}`;
}

// ---- Step + context -------------------------------------------------------------

/** One drawn card: language-free (the text is looked up in the active bank), with its type so
 *  the reducer can tell open from closed questions. */
export const ZDeckCardSchema = z.object({ id: z.number().int().positive(), type: ZQuestionTypeSchema });
export type TDeckCard = { id: number; type: TQuestionType };

export const ZResultSchema = z.enum(['match', 'miss']);
export type TResult = z.infer<typeof ZResultSchema>;

/** Canonical closed-answer tokens: yes_no → 'yes' | 'no'; who_of_two → 'p0' | 'p1' (player
 *  index in the couple). Language-free, so a language change mid-game cannot break scoring. */
export const CLOSED_TOKENS: Partial<Record<TQuestionType, readonly string[]>> = {
  yes_no: ['yes', 'no'],
  who_of_two: ['p0', 'p1'],
};
/** A closed question is auto-judged on the guesser's pick; any other type is revealed + judged. */
export function isClosedType(type: TQuestionType | undefined): boolean {
  return type !== undefined && CLOSED_TOKENS[type] !== undefined;
}

const idx = z.number().int().min(0).max(DECK_MAX);
const ZSecretsSchema = z
  .record(z.string().max(32), z.string().max(SECRET_MAX))
  .refine((s) => Object.keys(s).length <= 4 * DECK_MAX, { message: 'too many secrets' });
const secrets = { secrets: ZSecretsSchema };
const slot = { q: idx, couple: z.number().int().min(0).max(3) };

export const ZStepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ask'), q: idx }),
  z.object({
    kind: z.literal('resolve'),
    q: idx,
    couple: slot.couple,
    results: z.record(ZTeamIdSchema, ZResultSchema),
  }),
  z.object({ kind: z.literal('gate'), side: z.enum(['answerers', 'guessers']), ...secrets }),
  z.object({ kind: z.literal('handoff'), ...slot, ...secrets }),
  z.object({ kind: z.literal('secret'), ...slot, ...secrets }),
  z.object({ kind: z.literal('guess'), ...slot, ...secrets }),
  z.object({ kind: z.literal('judge'), ...slot, ...secrets }),
  z.object({ kind: z.literal('rapidIntro') }),
  z.object({ kind: z.literal('rapidTurn'), couple: slot.couple }),
  z.object({ kind: z.literal('rapidAsk'), ...slot }),
  z.object({ kind: z.literal('rapidJudge'), ...slot }),
  z.object({ kind: z.literal('scoreboard'), resumeQ: idx.optional() }),
  z.object({ kind: z.literal('final') }),
]);

type TSlot = { q: number; couple: number };
type TSecrets = { secrets: Record<string, string> };
/**
 * Where the game is. `q` is the question index INSIDE the current segment (rapid: per couple,
 * 0–4); `couple` indexes the roster. A countdown is a UI beat, not a step: resume lands on
 * `ask` / `rapidAsk` (READY again).
 */
export type TStep =
  | { kind: 'ask'; q: number }
  | { kind: 'resolve'; q: number; couple: number; results: Record<TTeamId, TResult> }
  | ({ kind: 'gate'; side: 'answerers' | 'guessers' } & TSecrets)
  | ({ kind: 'handoff' } & TSlot & TSecrets)
  | ({ kind: 'secret' } & TSlot & TSecrets)
  | ({ kind: 'guess' } & TSlot & TSecrets)
  | ({ kind: 'judge' } & TSlot & TSecrets)
  | { kind: 'rapidIntro' }
  | { kind: 'rapidTurn'; couple: number }
  | ({ kind: 'rapidAsk' } & TSlot)
  | ({ kind: 'rapidJudge' } & TSlot)
  | { kind: 'scoreboard'; resumeQ?: number }
  | { kind: 'final' };
export type TStepKind = TStep['kind'];
export type TStepOf<K extends TStepKind> = Extract<TStep, { kind: K }>;

export const ZGameCtxSchema = z.object({
  roster: ZRosterSchema,
  mode: ZModeSchema,
  difficulty: ZGameDifficultySchema,
  themes: z.array(ZThemeIdSchema).max(THEME_IDS.length),
  deck: z.array(ZDeckCardSchema).max(DECK_MAX),
  scores: z.record(ZTeamIdSchema, z.number().int().nonnegative()),
  history: z.array(ZHistoryEntrySchema).max(HISTORY_MAX),
  /** Index into `planOf(mode, deck.length)`. */
  seg: z.number().int().min(0).max(3),
  /** +1 on every legal transition; events carry the seq the screen rendered (double-tap guard). */
  seq: z.number().int().nonnegative(),
});
export type TGameCtx = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TDeckCard[];
  scores: Record<TTeamId, number>;
  history: THistoryEntry[];
  seg: number;
  seq: number;
};

export const ZGameSchema = z.object({ ctx: ZGameCtxSchema, step: ZStepSchema });
export type TGame = { ctx: TGameCtx; step: TStep };

// ---- Start + consistency --------------------------------------------------------

/** The step a segment opens on. */
export function firstStepOf(segment: TSegment): TStep {
  switch (segment.kind) {
    case 'flash':
      return { kind: 'gate', side: 'answerers', secrets: {} };
    case 'dilemma':
      return { kind: 'ask', q: 0 };
    case 'rapid':
      return { kind: 'rapidIntro' };
  }
}

export type TNewGameConfig = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  /** The drawn deck (`drawDeck`): any objects with `id` + `type`; only those two are kept. */
  deck: readonly TDeckCard[];
};

/** A fresh game at its first step, every team at 0. */
export function newGame(config: TNewGameConfig): TGame {
  const scores: Record<TTeamId, number> = {};
  for (const team of config.roster) scores[team.teamId] = 0;
  const deck = config.deck.map(({ id, type }) => ({ id, type }));
  const [first] = planOf(config.mode, deck.length);
  return {
    ctx: {
      roster: config.roster,
      mode: config.mode,
      difficulty: config.difficulty,
      themes: config.themes,
      deck,
      scores,
      history: [],
      seg: 0,
      seq: 0,
    },
    step: first ? firstStepOf(first) : { kind: 'final' },
  };
}

/** The segment a game is in (undefined only for an inconsistent game). */
export function segmentOf(ctx: TGameCtx): TSegment | undefined {
  return planOf(ctx.mode, ctx.deck.length)[ctx.seg];
}

/** Steps legal inside each segment kind (scoreboard + final are legal anywhere). */
const STEPS_BY_SEGMENT: Record<TSegment['kind'], readonly TStepKind[]> = {
  flash: ['gate', 'handoff', 'secret', 'guess', 'judge'],
  dilemma: ['ask', 'resolve'],
  rapid: ['rapidIntro', 'rapidTurn', 'rapidAsk', 'rapidJudge'],
};

/**
 * Cross-field checks Zod alone cannot express: the segment exists, the step belongs to it,
 * indices fit the roster and the segment, scores are keyed by roster teams. A stored game that
 * fails this is discarded (never silently restarted). `hasQuestion` optionally checks every
 * deck id against the bank.
 */
export function isGameConsistent(game: TGame, hasQuestion?: (id: number) => boolean): boolean {
  const { ctx, step } = game;
  const segment = segmentOf(ctx);
  if (!segment) return false;
  const teamIds = new Set(ctx.roster.map((t) => t.teamId));
  if (teamIds.size !== ctx.roster.length) return false;
  if (Object.keys(ctx.scores).some((id) => !teamIds.has(id))) return false;
  if (ctx.history.some((h) => !teamIds.has(h.teamId))) return false;
  if (hasQuestion && ctx.deck.some((card) => !hasQuestion(card.id))) return false;
  if (step.kind === 'scoreboard' || step.kind === 'final') {
    return step.kind === 'final' || step.resumeQ === undefined || (segment.kind === 'dilemma' && step.resumeQ < segment.count);
  }
  if (!STEPS_BY_SEGMENT[segment.kind].includes(step.kind)) return false;
  if ('couple' in step && step.couple >= ctx.roster.length) return false;
  if ('q' in step) {
    const qMax = segment.kind === 'flash' ? FLASH_SET : segment.kind === 'dilemma' ? segment.count : segment.perCouple;
    if (step.q >= qMax) return false;
  }
  if (step.kind === 'resolve' && Object.keys(step.results).some((id) => !teamIds.has(id))) return false;
  return true;
}
