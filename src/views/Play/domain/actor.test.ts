import { describe, expect, it } from 'vitest';
import type { TRoster } from '@/shared/game/domain/types';
import type { TQuestion } from '@/shared/questions/domain/types';
import { actorOf, playerSlot, type TActor } from './actor';
import { initGame, type TGameContext, type TGameState } from './machine';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bo'] },
  { teamId: 't2', avatarId: 'lions', players: ['Cy', 'Di'] },
];
const solo: TRoster = [roster[0]!];
const deck: TQuestion[] = [];

function ctx(r: TRoster): TGameContext {
  const s = initGame({ roster: r, mode: 'ultime', difficulty: 'mix', themes: [], deck });
  const { roster: ros, mode, difficulty, themes, scores, history } = s;
  return { roster: ros, mode, difficulty, themes, deck, scores, history };
}

const answers = {};
/** Every state kind, for a given roster. */
function states(r: TRoster, round: number, coupleIdx: number): TGameState[] {
  const c = ctx(r);
  return [
    { kind: 'question', questionIdx: 0, ...c },
    { kind: 'countdown', questionIdx: 0, ...c },
    { kind: 'resolve', questionIdx: 0, coupleIdx, results: {}, ...c },
    { kind: 'sideAnswerers', round, ...c },
    { kind: 'handoff', round, questionIdx: 0, coupleIdx, secretAnswers: answers, ...c },
    { kind: 'secretInput', round, questionIdx: 0, coupleIdx, secretAnswers: answers, ...c },
    { kind: 'sideGuessers', round, secretAnswers: answers, ...c },
    { kind: 'guess', round, questionIdx: 0, coupleIdx, secretAnswers: answers, ...c },
    { kind: 'judge', round, questionIdx: 0, coupleIdx, secretAnswers: answers, ...c },
    { kind: 'rapidIntro', ...c },
    { kind: 'rapidTurn', coupleIdx, ...c },
    { kind: 'rapidQuestion', coupleIdx, questionIdx: 0, ...c },
    { kind: 'rapidCountdown', coupleIdx, questionIdx: 0, ...c },
    { kind: 'rapidJudge', coupleIdx, questionIdx: 0, ...c },
    { kind: 'scoreboard', round, questionIdx: 0, ...c },
    { kind: 'final', ...c },
  ];
}

const byKind = (all: TGameState[]) => (kind: TGameState['kind']) => actorOf(all.find((s) => s.kind === kind)!);
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
      [2, 0, 1],
    ] as const) {
      const of = byKind(states(roster, round, 1));
      expect(of('handoff')).toEqual(player(roster[1]!, answerer));
      expect(of('secretInput')).toEqual(player(roster[1]!, answerer));
      expect(of('guess')).toEqual(player(roster[1]!, guesser));
    }
  });

  it('Flash side gates: a whole side → the table; solo has no side → the one couple’s answerer / guesser', () => {
    const multi = byKind(states(roster, 1, 0));
    expect(multi('sideAnswerers')).toEqual(table);
    expect(multi('sideGuessers')).toEqual(table);
    const one = byKind(states(solo, 1, 0));
    expect(one('sideAnswerers')).toEqual(player(solo[0]!, 1));
    expect(one('sideGuessers')).toEqual(player(solo[0]!, 0));
  });

  it('Flash judge is the table', () => {
    expect(byKind(states(roster, 0, 0))('judge')).toEqual(table);
  });

  it('Dilemma: the table points; the current couple self-confirms', () => {
    const of = byKind(states(roster, 0, 1));
    expect(of('question')).toEqual(table);
    expect(of('countdown')).toEqual(table);
    expect(of('resolve')).toEqual(couple(roster[1]!));
  });

  it('Rapid-fire: the current couple answers, the crowd judges', () => {
    const of = byKind(states(roster, 0, 1));
    expect(of('rapidIntro')).toEqual(table);
    expect(of('rapidTurn')).toEqual(couple(roster[1]!));
    expect(of('rapidQuestion')).toEqual(couple(roster[1]!));
    expect(of('rapidCountdown')).toEqual(couple(roster[1]!));
    expect(of('rapidJudge')).toEqual(table);
  });

  it('scoreboard and final: the table', () => {
    const of = byKind(states(roster, 0, 0));
    expect(of('scoreboard')).toEqual(table);
    expect(of('final')).toEqual(table);
  });

  it('covers every state kind', () => {
    expect(new Set(states(roster, 0, 0).map((s) => s.kind)).size).toBe(16);
  });
});
