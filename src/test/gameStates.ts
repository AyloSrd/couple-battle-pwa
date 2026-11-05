import type { TRoster } from '@/shared/game/domain/types';
import { newGame, type TStep, type TStepKind } from '@/shared/game/domain/game';
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
