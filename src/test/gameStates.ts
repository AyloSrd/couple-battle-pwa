import type { TRoster } from '@/shared/game/domain/types';
import type { TQuestion } from '@/shared/questions/domain/types';
import { initGame, type TGameContext, type TGameState } from '@/views/Play/domain/machine';

/** Two couples: the first has shipped art (otters), the second does not (penguins → initial fallback). */
export const testRoster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bo'] },
  { teamId: 't2', avatarId: 'penguins', players: ['Zed', 'Yan'] },
];

const deck: TQuestion[] = Array.from({ length: 4 }, (_, i) => ({
  id: i + 1,
  theme: 'childhood',
  difficulty: 'easy',
  type: 'open',
  you: `q${i + 1}`,
  name: `q${i + 1} de {name}`,
}));

/** A game state of `kind` at (round, coupleIdx) — for rendering a screen without driving the machine. */
export function gameState<K extends TGameState['kind']>(
  kind: K,
  at: { round?: number; coupleIdx?: number; roster?: TRoster } = {},
): Extract<TGameState, { kind: K }> {
  const roster = at.roster ?? testRoster;
  const s = initGame({ roster, mode: 'ultime', difficulty: 'mix', themes: [], deck });
  const ctx: TGameContext = {
    roster,
    mode: s.mode,
    difficulty: s.difficulty,
    themes: s.themes,
    deck,
    scores: s.scores,
    history: s.history,
  };
  const slot = { round: at.round ?? 0, coupleIdx: at.coupleIdx ?? 0, questionIdx: 0, secretAnswers: {}, results: {} };
  return { kind, ...slot, ...ctx } as unknown as Extract<TGameState, { kind: K }>;
}
