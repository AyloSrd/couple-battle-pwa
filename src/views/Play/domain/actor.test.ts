import { describe, expect, it } from 'vitest';
import type { TRoster } from '@/shared/game/domain/types';
import { newGame, type TGame, type TStep } from '@/shared/game/domain/game';
import { actorOf, playerSlot, type TActor } from './actor';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bo'] },
  { teamId: 't2', avatarId: 'lions', players: ['Cy', 'Di'] },
];
const solo: TRoster = [roster[0]!];

/** Every step kind, for a given roster; Flash steps sit in Flash round `round` (seg 0 | 1). */
function games(r: TRoster, round: 0 | 1, couple: number): TGame[] {
  const { ctx } = newGame({ roster: r, mode: 'ultime', difficulty: 'mix', themes: [], deck: [] });
  const secrets = {};
  const g = (step: TStep, seg: number): TGame => ({ ctx: { ...ctx, seg }, step });
  return [
    g({ kind: 'ask', q: 0 }, 2),
    g({ kind: 'resolve', q: 0, couple, results: {} }, 2),
    g({ kind: 'gate', side: 'answerers', secrets }, round),
    g({ kind: 'handoff', q: 0, couple, secrets }, round),
    g({ kind: 'secret', q: 0, couple, secrets }, round),
    g({ kind: 'gate', side: 'guessers', secrets }, round),
    g({ kind: 'guess', q: 0, couple, secrets }, round),
    g({ kind: 'judge', q: 0, couple, secrets }, round),
    g({ kind: 'rapidIntro' }, 3),
    g({ kind: 'rapidTurn', couple }, 3),
    g({ kind: 'rapidAsk', couple, q: 0 }, 3),
    g({ kind: 'rapidJudge', couple, q: 0 }, 3),
    g({ kind: 'scoreboard' }, round),
    g({ kind: 'final' }, 3),
  ];
}

type TKey = TStep['kind'] | 'gate answerers' | 'gate guessers';
const keyOf = (game: TGame): TKey => (game.step.kind === 'gate' ? `gate ${game.step.side}` : game.step.kind);
const byKind = (all: TGame[]) => (key: TKey) => actorOf(all.find((g) => keyOf(g) === key)!);
const player = (team: TRoster[number], playerIdx: 0 | 1): TActor => ({ kind: 'player', team, playerIdx });
const couple = (team: TRoster[number]): TActor => ({ kind: 'couple', team });
const table: TActor = { kind: 'table' };

describe('actorOf', () => {
  it('playerSlot: players[0] ↔ p1, players[1] ↔ p2', () => {
    expect(playerSlot(0)).toBe(1);
    expect(playerSlot(1)).toBe(2);
  });

  it('Flash: the answerer answers (and takes the handoff), the guesser guesses — swapped each round', () => {
    for (const [round, answerer, guesser] of [
      [0, 0, 1],
      [1, 1, 0],
    ] as const) {
      const of = byKind(games(roster, round, 1));
      expect(of('handoff')).toEqual(player(roster[1]!, answerer));
      expect(of('secret')).toEqual(player(roster[1]!, answerer));
      expect(of('guess')).toEqual(player(roster[1]!, guesser));
    }
  });

  it('Flash side gates: a whole side → the table; solo has no side → the one couple’s answerer / guesser', () => {
    const multi = byKind(games(roster, 1, 0));
    expect(multi('gate answerers')).toEqual(table);
    expect(multi('gate guessers')).toEqual(table);
    const one = byKind(games(solo, 1, 0));
    expect(one('gate answerers')).toEqual(player(solo[0]!, 1));
    expect(one('gate guessers')).toEqual(player(solo[0]!, 0));
  });

  it('Flash judge is the table', () => {
    expect(byKind(games(roster, 0, 0))('judge')).toEqual(table);
  });

  it('Dilemma: the table points (the countdown is part of ask); the current couple self-confirms', () => {
    const of = byKind(games(roster, 0, 1));
    expect(of('ask')).toEqual(table);
    expect(of('resolve')).toEqual(couple(roster[1]!));
  });

  it('Rapid-fire: the current couple answers, the crowd judges', () => {
    const of = byKind(games(roster, 0, 1));
    expect(of('rapidIntro')).toEqual(table);
    expect(of('rapidTurn')).toEqual(couple(roster[1]!));
    expect(of('rapidAsk')).toEqual(couple(roster[1]!));
    expect(of('rapidJudge')).toEqual(table);
  });

  it('scoreboard and final: the table', () => {
    const of = byKind(games(roster, 0, 0));
    expect(of('scoreboard')).toEqual(table);
    expect(of('final')).toEqual(table);
  });

  it('covers every step kind (and both gate sides)', () => {
    expect(new Set(games(roster, 0, 0).map((g) => g.step.kind)).size).toBe(13);
    expect(new Set(games(roster, 0, 0).map(keyOf)).size).toBe(14);
  });

  it('a snapshot whose couple index points past the roster (old save) degrades to the table, never throws', () => {
    const of = byKind(games(roster, 0, 7));
    for (const kind of ['handoff', 'secret', 'guess', 'resolve', 'rapidTurn', 'rapidAsk'] as const) {
      expect(of(kind)).toEqual(table);
    }
  });

  it('an empty roster has no solo side and no actor', () => {
    const of = byKind(games([], 0, 0));
    expect(of('gate answerers')).toEqual(table);
    expect(of('gate guessers')).toEqual(table);
  });
});
