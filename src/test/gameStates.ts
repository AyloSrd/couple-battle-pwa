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
export const testQuestions: TQuestion[] = Array.from({ length: 4 }, (_, i) => ({
  id: i + 1,
  theme: 'childhood',
  difficulty: 'easy',
  type: 'open',
  you: `q${i + 1}`,
  name: `q${i + 1} de {name}`,
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
  switch (kind) {
    case 'ask':
      return { kind, q: 0 };
    case 'resolve':
      return { kind, ...slot, results: {} };
    case 'gate':
      return { kind, side, secrets: {} };
    case 'handoff':
    case 'secret':
    case 'guess':
    case 'judge':
      return { kind, ...slot, secrets: {} };
    case 'rapidTurn':
      return { kind, couple };
    case 'rapidAsk':
    case 'rapidJudge':
      return { kind, ...slot };
    case 'rapidIntro':
    case 'scoreboard':
    case 'final':
      return { kind };
  }
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
