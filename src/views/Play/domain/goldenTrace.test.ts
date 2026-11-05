import { describe, expect, it } from 'vitest';
import { ZGameSchema, isGameConsistent, newGame, type TGame } from '@/shared/game/domain/game';
import { GOLDEN_CASES, goldenRoster, runTrace, type TAction, type TNormStep } from '@/test/goldenTrace';
import golden from './goldenTraces.json';
import { cardOf, reduce } from './machine';

/**
 * Regression net for the machine redesign: `goldenTraces.json` was recorded from the
 * pre-refactor machine (17 states, 10 events) with the scripted policy in `@/test/goldenTrace`.
 * The new reducer must show the same screens, cursors, cards, secrets, scores and history.
 * The recording is data: never re-record it from the new machine.
 */

function observe(game: TGame): TNormStep {
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

function act(game: TGame, action: TAction): TGame {
  const next = reduce(game, { ...action, seq: game.ctx.seq });
  // every transition of a scripted game is a valid, consistent save
  expect(ZGameSchema.safeParse(next).success).toBe(true);
  expect(isGameConsistent(next)).toBe(true);
  expect(next.ctx.seq).toBe(game.ctx.seq + 1);
  return next;
}

const recorded = golden as Record<string, string[]>;

describe('golden traces — the new machine replays the legacy recording', () => {
  it('covers every recorded case', () => {
    expect(Object.keys(recorded).sort()).toEqual(GOLDEN_CASES.map((c) => c.name).sort());
  });

  it.each(GOLDEN_CASES.map((c) => [c.name, c] as const))('%s', (name, c) => {
    const start = newGame({ roster: goldenRoster(c.couples), mode: c.mode, difficulty: 'mix', themes: [], deck: c.deck });
    expect(runTrace(start, observe, act)).toEqual(recorded[name]);
  });
});
