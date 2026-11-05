import type { TTeam } from '@/shared/game/domain/types';
import {
  CLOSED_TOKENS,
  FLASH_SET,
  POINTS,
  SECRET_MAX,
  answerKey,
  answererIndex,
  firstStepOf,
  isClosedType,
  planOf,
  segmentOf,
  type TDeckCard,
  type TGame,
  type TGameCtx,
  type TResult,
  type TSegment,
  type TStage,
  type TStep,
  type TStepKind,
  type TStepOf,
} from '@/shared/game/domain/game';
import { normalizeText } from '@/shared/game/domain/text';
import type { TQuestion } from '@/shared/questions/domain/types';
import { interpolate } from '@/shared/i18n/domain/services';

/**
 * The in-game rule book (ARCHITECTURE's one sanctioned deviation from 1-route-1-view): a pure
 * reducer over `TGame = { ctx, step }`. The game is a plan of segments (`planOf`): Flash
 * rounds ("sofa sides"), a Dilemma block, the rapid-fire finale; a scoreboard follows every
 * segment but the last, plus the standalone-Dilemma halfway board.
 *
 * Four events. An event that is illegal for the step, or that carries a `seq` other than
 * `ctx.seq` (a double tap, a timer racing a tap), returns THE SAME OBJECT: no render, no write.
 * Every legal transition bumps `ctx.seq` by one.
 */

export type TVerdict = 'exact' | 'close' | 'miss';
export type TGameEventBody =
  | { type: 'next' }
  | { type: 'answer'; value: string }
  | { type: 'guess'; value: string }
  | { type: 'verdict'; v: TVerdict };
export type TGameEvent = { seq: number } & TGameEventBody;

/** A game narrowed to step kinds (distributive, so one kind fits a screen taking several). */
export type TGameAt<K extends TStepKind> = K extends TStepKind ? { ctx: TGameCtx; step: TStepOf<K> } : never;

type TFlashSlotKind = 'handoff' | 'secret' | 'guess' | 'judge';
type TSlot = { q: number; couple: number };

const FLASH_SLOT_KINDS: ReadonlySet<TStepKind> = new Set<TFlashSlotKind>(['handoff', 'secret', 'guess', 'judge']);
const DILEMMA_CARD_KINDS: ReadonlySet<TStepKind> = new Set<TStepKind>(['ask', 'resolve']);
const RAPID_CARD_KINDS: ReadonlySet<TStepKind> = new Set<TStepKind>(['rapidAsk', 'rapidJudge']);
/** The rapid-fire finale's screens (tense music, sunburst background). */
export const RAPID_KINDS: ReadonlySet<TStepKind> = new Set<TStepKind>(['rapidIntro', 'rapidTurn', 'rapidAsk', 'rapidJudge']);

// ---- View helpers -------------------------------------------------------------

/** Narrow a game to the screens of the given step kinds. */
export function isAt<K extends TStepKind>(game: TGame, ...kinds: K[]): game is TGameAt<K> {
  return (kinds as TStepKind[]).includes(game.step.kind);
}

/** Questions in the current segment (Flash: per round; rapid: per couple) — the progress dots. */
export function segmentLength(ctx: TGameCtx): number {
  const segment = segmentOf(ctx);
  if (!segment) return 0;
  return segment.kind === 'flash' ? FLASH_SET : segment.kind === 'dilemma' ? segment.count : segment.perCouple;
}

/** The Flash round (0 | 1) the game is in; 0 outside Flash. Decides who answers. */
export function flashRound(ctx: TGameCtx): 0 | 1 {
  const segment = segmentOf(ctx);
  return segment?.kind === 'flash' ? segment.round : 0;
}

/** Deck index of the card the step shows (undefined: the step has no card). */
export function deckIndexOf(game: TGame): number | undefined {
  const { step } = game;
  const segment = segmentOf(game.ctx);
  if (!segment || !('q' in step)) return undefined;
  if (segment.kind === 'flash' && FLASH_SLOT_KINDS.has(step.kind)) return segment.round * FLASH_SET + step.q;
  if (segment.kind === 'dilemma' && DILEMMA_CARD_KINDS.has(step.kind)) return segment.from + step.q;
  if (segment.kind === 'rapid' && RAPID_CARD_KINDS.has(step.kind) && 'couple' in step) {
    return segment.from + step.couple * segment.perCouple + step.q;
  }
  return undefined;
}

/** The card on screen; undefined past the end of a short deck. */
export function cardOf(game: TGame): TDeckCard | undefined {
  const index = deckIndexOf(game);
  return index === undefined ? undefined : game.ctx.deck[index];
}

/** The couple the step is about (resolve, Flash slots, rapid-fire). */
export function teamOf(game: TGame): TTeam | undefined {
  return 'couple' in game.step ? game.ctx.roster[game.step.couple] : undefined;
}

/** The answerer's locked answer for the current Flash slot (what the guesser is judged on). */
export function secretOf(game: TGame): string | undefined {
  const team = teamOf(game);
  const card = cardOf(game);
  if (!team || !card || !('secrets' in game.step)) return undefined;
  return game.step.secrets[answerKey(team.teamId, card.id)];
}

/** Names of the couple in the Flash spotlight: the round's answerer and their partner. */
export function flashNames(game: TGame): { answererName: string; guesserName: string } {
  const team = teamOf(game);
  const a = answererIndex(flashRound(game.ctx));
  return { answererName: team?.players[a] ?? '', guesserName: team?.players[1 - a] ?? '' };
}

/** Rapid-fire: which partner a question's `{name}` is about — they take turns. */
export function rapidSubjectIndex(q: number): 0 | 1 {
  return (q % 2) as 0 | 1;
}

/**
 * Which addressee variant a screen renders: `you` — the person answering about themselves;
 * `name` — the table / partner, with `{name}` filled from the roster.
 */
export type TAddressee = 'you' | 'name';

/** Render a question for a screen role (same interpolation as the string templates). */
export function questionText(question: TQuestion | undefined, addressee: TAddressee, answererName = ''): string {
  if (!question) return '';
  if (addressee === 'you') return question.you;
  return interpolate(question.name, { name: answererName });
}

export type TRankedTeam = { team: TTeam; score: number; isWinner: boolean };

export function rankTeams(ctx: Pick<TGameCtx, 'roster' | 'scores'>): TRankedTeam[] {
  const scored = ctx.roster.map((team) => ({ team, score: ctx.scores[team.teamId] ?? 0 }));
  const max = scored.reduce((m, s) => Math.max(m, s.score), 0);
  return scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s, isWinner: s.score === max }));
}

/** The slot after `slot`, couple fastest, then question. `null` = phase done. */
export function nextFlashSlot(couples: number, slot: TSlot): TSlot | null {
  if (slot.couple + 1 < couples) return { q: slot.q, couple: slot.couple + 1 };
  if (slot.q + 1 < FLASH_SET) return { q: slot.q + 1, couple: 0 };
  return null;
}

// ---- Transitions --------------------------------------------------------------

/**
 * The single way a question gets scored: bumps the team's total AND appends the history
 * entry (a zero still records — a miss is data), so the two cannot drift.
 */
function score(ctx: TGameCtx, teamId: string, stage: TStage, round: number, points: number, max: number): TGameCtx {
  const scores = points === 0 ? ctx.scores : { ...ctx.scores, [teamId]: (ctx.scores[teamId] ?? 0) + points };
  return { ...ctx, scores, history: [...ctx.history, { teamId, stage, round, points, max }] };
}

/** Segment done: a scoreboard, or the final after the last segment. */
function endSegment(ctx: TGameCtx): TGame {
  const last = ctx.seg >= planOf(ctx.mode, ctx.deck.length).length - 1;
  return { ctx, step: last ? { kind: 'final' } : { kind: 'scoreboard' } };
}

/** An answering slot: with several couples a light handoff names who's next; solo goes straight in. */
function collectStep(ctx: TGameCtx, slot: TSlot, secrets: Record<string, string>): TStep {
  return { kind: ctx.roster.length > 1 ? 'handoff' : 'secret', ...slot, secrets };
}

/** The locked value for an answer, or null when the answer is not acceptable. */
function lockedValue(card: TDeckCard | undefined, value: string): string | null | undefined {
  if (!card) return undefined; // short deck: accepted, stored nowhere
  const tokens = CLOSED_TOKENS[card.type];
  if (tokens) return tokens.includes(value) ? value : null;
  const text = normalizeText(value, SECRET_MAX);
  return text === '' ? null : text;
}

/** Score a guessed Flash slot, drop its secret, move to the next slot or end the segment. */
function scoreFlashSlot(game: TGameAt<'guess' | 'judge'>, points: number): TGame | undefined {
  const { ctx, step } = game;
  const team = ctx.roster[step.couple];
  if (!team) return undefined;
  const card = cardOf(game);
  const next = score(ctx, team.teamId, 'flash', flashRound(ctx), points, POINTS.flash.exact);
  // The judged slot's secret has served its purpose: it leaves the state (and the save).
  const secrets = { ...step.secrets };
  if (card) delete secrets[answerKey(team.teamId, card.id)];
  const slot = nextFlashSlot(ctx.roster.length, step);
  if (slot) return { ctx: next, step: { kind: 'guess', ...slot, secrets } };
  return endSegment(next); // the round's secrets vanish with the guess phase
}

function isVerdict<V extends TVerdict>(event: TGameEventBody, allowed: readonly V[]): event is { type: 'verdict'; v: V } {
  return event.type === 'verdict' && (allowed as readonly TVerdict[]).includes(event.v);
}

/** The next game, or `undefined` when the event is illegal for the step. */
function transition(game: TGame, event: TGameEventBody, segment: TSegment): TGame | undefined {
  const { ctx, step } = game;
  switch (step.kind) {
    case 'ask':
      if (event.type !== 'next') return undefined;
      return { ctx, step: { kind: 'resolve', q: step.q, couple: 0, results: {} } };

    case 'resolve': {
      const team = ctx.roster[step.couple];
      if (!team || segment.kind !== 'dilemma' || !isVerdict(event, ['exact', 'miss'])) return undefined;
      const result: TResult = event.v === 'exact' ? 'match' : 'miss';
      const next = score(ctx, team.teamId, 'dilemma', 0, POINTS.dilemma[event.v], POINTS.dilemma.exact);
      const results = { ...step.results, [team.teamId]: result };
      if (step.couple + 1 < ctx.roster.length) {
        return { ctx: next, step: { kind: 'resolve', q: step.q, couple: step.couple + 1, results } };
      }
      const answered = step.q + 1;
      if (answered >= segment.count) return endSegment(next);
      if (segment.halfway && answered === Math.floor(segment.count / 2)) {
        return { ctx: next, step: { kind: 'scoreboard', resumeQ: answered } };
      }
      return { ctx: next, step: { kind: 'ask', q: answered } };
    }

    case 'gate':
      if (event.type !== 'next') return undefined;
      if (step.side === 'answerers') return { ctx, step: collectStep(ctx, { q: 0, couple: 0 }, {}) };
      return { ctx, step: { kind: 'guess', q: 0, couple: 0, secrets: step.secrets } };

    case 'handoff':
      if (event.type !== 'next') return undefined;
      return { ctx, step: { ...step, kind: 'secret' } };

    case 'secret': {
      if (event.type !== 'answer') return undefined;
      const team = ctx.roster[step.couple];
      const card = cardOf(game);
      const value = lockedValue(card, event.value);
      if (!team || value === null) return undefined;
      const secrets = card && value !== undefined ? { ...step.secrets, [answerKey(team.teamId, card.id)]: value } : step.secrets;
      const slot = nextFlashSlot(ctx.roster.length, step);
      // every answerer has answered every shared question → the phone crosses the sofa
      return { ctx, step: slot ? collectStep(ctx, slot, secrets) : { kind: 'gate', side: 'guessers', secrets } };
    }

    case 'guess': {
      const card = cardOf(game);
      const closed = isClosedType(card?.type);
      if (event.type === 'next' && !closed) return { ctx, step: { ...step, kind: 'judge' } };
      if (event.type !== 'guess' || (card && !closed)) return undefined;
      if (card && !CLOSED_TOKENS[card.type]?.includes(event.value)) return undefined;
      const truth = secretOf(game);
      return scoreFlashSlot({ ctx, step }, truth !== undefined && event.value === truth ? POINTS.flash.exact : 0);
    }

    case 'judge':
      if (!isVerdict(event, ['exact', 'close', 'miss'])) return undefined;
      return scoreFlashSlot({ ctx, step }, POINTS.flash[event.v]);

    case 'rapidIntro':
      return event.type === 'next' ? { ctx, step: { kind: 'rapidTurn', couple: 0 } } : undefined;

    case 'rapidTurn':
      return event.type === 'next' ? { ctx, step: { kind: 'rapidAsk', q: 0, couple: step.couple } } : undefined;

    case 'rapidAsk':
      return event.type === 'next' ? { ctx, step: { ...step, kind: 'rapidJudge' } } : undefined;

    case 'rapidJudge': {
      const team = ctx.roster[step.couple];
      if (!team || segment.kind !== 'rapid' || !isVerdict(event, ['exact', 'miss'])) return undefined;
      const next = score(ctx, team.teamId, 'rapid', 0, POINTS.rapid[event.v], POINTS.rapid.exact);
      if (step.q + 1 < segment.perCouple) return { ctx: next, step: { kind: 'rapidAsk', q: step.q + 1, couple: step.couple } };
      if (step.couple + 1 < ctx.roster.length) return { ctx: next, step: { kind: 'rapidTurn', couple: step.couple + 1 } };
      return endSegment(next);
    }

    case 'scoreboard': {
      if (event.type !== 'next') return undefined;
      if (step.resumeQ !== undefined) return { ctx, step: { kind: 'ask', q: step.resumeQ } };
      const following = planOf(ctx.mode, ctx.deck.length)[ctx.seg + 1];
      if (!following) return undefined;
      return { ctx: { ...ctx, seg: ctx.seg + 1 }, step: firstStepOf(following) };
    }

    case 'final':
      return undefined;
  }
}

/** Apply an event. Illegal or stale (`seq` ≠ `ctx.seq`) → the same object. */
export function reduce(game: TGame, event: TGameEvent): TGame {
  const segment = segmentOf(game.ctx);
  if (event.seq !== game.ctx.seq || !segment) return game;
  const next = transition(game, event, segment);
  if (!next) return game;
  return { ctx: { ...next.ctx, seq: game.ctx.seq + 1 }, step: next.step };
}
