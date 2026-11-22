import type { TRoster } from '@/shared/game/domain/types';
import { answerKey, newGame, type TStep, type TStepKind } from '@/shared/game/domain/game';
import type { TQuestion } from '@/shared/questions/domain/types';
import { cardOf, type TGameAt } from '@/views/Play/domain/machine';

/** Two couples: the first has shipped art (otters), the second does not (penguins → initial fallback). */
export const testRoster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bo'] },
  { teamId: 't2', avatarId: 'penguins', players: ['Zed', 'Yan'] },
];

/** The bank the test deck's ids resolve to (the deck itself holds ids + types only). */
export const testQuestions: TQuestion[] = [1, 2, 3, 4].map((id) => ({
  ...{ id, theme: 'childhood', difficulty: 'easy', type: 'open' },
  ...{ you: `q${id}`, name: `q${id} de {name}` },
}));

type TAt = { round?: 0 | 1; couple?: number; roster?: TRoster; side?: 'answerers' | 'guessers' };

/** Ultime segment a step kind lives in (Flash steps: the Flash round). */
function segOf(kind: TStepKind, round: number): number {
  if (kind === 'ask' || kind === 'resolve') return 2;
  if (kind === 'rapidIntro' || kind === 'rapidTurn' || kind === 'rapidAsk' || kind === 'rapidJudge' || kind === 'final') return 3;
  return round;
}

function stepOf(kind: TStepKind, couple: number, side: 'answerers' | 'guessers'): TStep {
  const slot = { q: 0, couple };
  if (kind === 'ask') return { kind, q: 0 };
  if (kind === 'resolve') return { kind, ...slot, results: {} };
  if (kind === 'gate') return { kind, side, secrets: {} };
  if (kind === 'rapidTurn') return { kind, couple };
  if (kind === 'rapidAsk' || kind === 'rapidJudge') return { kind, ...slot };
  if (kind === 'rapidIntro' || kind === 'scoreboard' || kind === 'final') return { kind };
  return { kind, ...slot, secrets: {} }; // handoff, secret, guess, judge
}

/** An Ultime game at step `kind` (Flash round, couple, roster, gate side) — for rendering a
 *  screen without driving the machine there. */
export function gameAt<K extends TStepKind>(kind: K, at: TAt = {}): TGameAt<K> {
  const roster = at.roster ?? testRoster;
  const { ctx } = newGame({ roster, mode: 'ultime', difficulty: 'mix', themes: [], deck: testQuestions });
  const step = stepOf(kind, at.couple ?? 0, at.side ?? 'answerers');
  return { ctx: { ...ctx, seg: segOf(kind, at.round ?? 0) }, step } as TGameAt<K>;
}

/** The question a screen of `game` shows, resolved from `bank` like Play does. */
export function questionFor(game: Parameters<typeof cardOf>[0], bank: readonly TQuestion[] = testQuestions): TQuestion | undefined {
  const card = cardOf(game);
  return card ? bank.find((q) => q.id === card.id) : undefined;
}

/** A choice question (P14): one `question`, three `options`; the same words for the answerer and the guesser. */
export const choiceQuestion = (id = 1): Extract<TQuestion, { type: 'choice' }> => ({
  id,
  theme: 'homeDaily',
  difficulty: 'easy',
  type: 'choice',
  question: `Card ${id} question`,
  options: [`Card ${id} option zero`, `Card ${id} option one is long enough that it has to wrap over several lines`, `Card ${id} option two`],
});

/** A classic question of `type` with id 1 (`you` / `name` as the other screen tests write them). */
export const classicQuestion = (type: 'open' | 'this_or_that' | 'yes_no' | 'who_of_two'): TQuestion => ({
  id: 1,
  theme: 'childhood',
  difficulty: 'easy',
  type,
  you: 'Q?',
  name: 'Q de {name}?',
});

/**
 * The game at a `secret` or `guess` step (Flash round 0, couple 0: Ana answers, Bo guesses) whose shown card, id 1, has the given
 * `type`. For a guess, `truth` is the answerer's locked answer (a token, or text).
 */
export function gameWithCard<K extends 'secret' | 'guess'>(kind: K, type: TQuestion['type'], truth?: string): TGameAt<K> {
  const base = gameAt(kind);
  const secrets = truth === undefined ? {} : { [answerKey('t1', 1)]: truth };
  return {
    ctx: { ...base.ctx, deck: [{ id: 1, type }] },
    step: kind === 'guess' ? { ...base.step, secrets } : base.step,
  } as TGameAt<K>;
}
