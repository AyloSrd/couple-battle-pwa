import { newGame, type TGame } from '@/shared/game/domain/game';
import { cardOf, reduce } from '@/views/Play/domain/machine';
import { goldenRoster, runTrace, type TAction, type TGoldenCase, type TNormStep } from './goldenTrace';

/** The golden-trace view of a game (what the scripted policy decides on). */
export function observeGame(game: TGame): TNormStep {
  const { ctx, step } = game;
  return {
    kind: step.kind,
    seg: step.kind === 'final' ? undefined : ctx.seg,
    side: step.kind === 'gate' ? step.side : undefined,
    q: 'q' in step ? step.q : undefined,
    couple: 'couple' in step ? step.couple : undefined,
    resumeQ: step.kind === 'scoreboard' ? step.resumeQ : undefined,
    card: cardOf(game),
    results: step.kind === 'resolve' ? step.results : undefined,
    secrets: 'secrets' in step ? step.secrets : undefined,
    scores: ctx.scores,
    history: ctx.history,
  };
}

export function startOf(c: TGoldenCase): TGame {
  return newGame({ roster: goldenRoster(c.couples), mode: c.mode, difficulty: 'mix', themes: [], deck: c.deck });
}

/**
 * Play a golden case to `final` with the scripted policy. `act` applies each action (default:
 * the bare reducer) and returns the next game; returns every game shown, start to final.
 */
export function playScripted(
  c: TGoldenCase,
  act: (game: TGame, action: TAction) => TGame = (game, action) => reduce(game, { ...action, seq: game.ctx.seq }),
  start: TGame = startOf(c),
): TGame[] {
  const games: TGame[] = [];
  runTrace(
    start,
    (game) => {
      games.push(game);
      return observeGame(game);
    },
    act,
  );
  return games;
}
