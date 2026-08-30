import { describe, expect, it } from 'vitest';
import {
  initGame,
  reduce,
  toSnapshot,
  fromSnapshot,
  rankTeams,
  activeCouple,
  scoreboardAt,
  flashDeckIndex,
  flashDeckSize,
  answererIndex,
  type TGameConfig,
  type TGameState,
  type TResult,
  type TVerdict,
} from './machine';
import type { TRoster } from '@/shared/game/domain/types';
import type { TQuestion, TQuestionType } from '@/shared/questions/domain/types';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
  { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
];

const deck: TQuestion[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  theme: 'childhood',
  difficulty: 'easy',
  type: 'who_of_two',
  text: `q${i + 1}`,
}));

const config: TGameConfig = { roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck };

/** Play one whole question: ready → countdown → each couple confirms. */
function playQuestion(state: TGameState, results: TResult[]): TGameState {
  let s = reduce(state, { type: 'ready' });
  s = reduce(s, { type: 'countdownDone' });
  for (const result of results) s = reduce(s, { type: 'confirm', result });
  return s;
}

describe('Dilemma machine', () => {
  it('initGame starts everyone at zero on the first question', () => {
    const s = initGame(config);
    expect(s.kind).toBe('question');
    expect(s.scores).toEqual({ t1: 0, t2: 0 });
  });

  it('scoreboardAt is the halfway point', () => {
    expect(scoreboardAt(10)).toBe(5);
  });

  it('question → countdown on ready (and ignores other events)', () => {
    const q = initGame(config);
    expect(reduce(q, { type: 'countdownDone' })).toBe(q);
    const c = reduce(q, { type: 'ready' });
    expect(c.kind).toBe('countdown');
    expect(c.scores).toEqual(q.scores);
  });

  it('countdown → resolve on countdownDone (active couple 0)', () => {
    const c = reduce(initGame(config), { type: 'ready' });
    const r = reduce(c, { type: 'countdownDone' });
    expect(r.kind).toBe('resolve');
    if (r.kind === 'resolve') {
      expect(r.coupleIdx).toBe(0);
      expect(r.results).toEqual({});
    }
    expect(activeCouple(r)?.teamId).toBe('t1');
  });

  it('resolve advances couple-by-couple, scoring matches only', () => {
    const c = reduce(initGame(config), { type: 'ready' });
    const r0 = reduce(c, { type: 'countdownDone' });
    const r1 = reduce(r0, { type: 'confirm', result: 'match' }); // t1 matches
    expect(r1.kind).toBe('resolve');
    if (r1.kind === 'resolve') {
      expect(r1.coupleIdx).toBe(1);
      expect(activeCouple(r1)?.teamId).toBe('t2');
      expect(r1.scores.t1).toBe(1);
      expect(r1.results).toEqual({ t1: 'match' });
    }
    const q2 = reduce(r1, { type: 'confirm', result: 'miss' }); // t2 misses → last couple → next question
    expect(q2.kind).toBe('question');
    expect(q2.scores).toEqual({ t1: 1, t2: 0 });
    if (q2.kind === 'question') expect(q2.questionIdx).toBe(1);
  });

  it('shows the scoreboard after the 5th question, then continues', () => {
    let s: TGameState = initGame(config);
    for (let i = 0; i < 4; i++) s = playQuestion(s, ['match', 'miss']); // Q1..Q4
    expect(s.kind).toBe('question');
    s = playQuestion(s, ['match', 'match']); // Q5 done → scoreboard
    expect(s.kind).toBe('scoreboard');
    if (s.kind === 'scoreboard') expect(s.questionIdx).toBe(5);
    const q6 = reduce(s, { type: 'next' });
    expect(q6.kind).toBe('question');
    if (q6.kind === 'question') expect(q6.questionIdx).toBe(5);
  });

  it('reaches the final after the 10th question', () => {
    let s: TGameState = initGame(config);
    for (let i = 0; i < 5; i++) s = playQuestion(s, ['match', 'miss']); // Q1..Q5
    s = reduce(s, { type: 'next' }); // past scoreboard → Q6
    for (let i = 0; i < 4; i++) s = playQuestion(s, ['match', 'miss']); // Q6..Q9
    expect(s.kind).toBe('question');
    s = playQuestion(s, ['miss', 'match']); // Q10 → final
    expect(s.kind).toBe('final');
    expect(s.scores.t1).toBe(9); // matched Q1-9, missed Q10
    expect(s.scores.t2).toBe(1); // missed Q1-9, matched Q10
  });

  it('final and scoreboard ignore unrelated events; final is terminal', () => {
    const final = reduce(
      { ...initGame(config), kind: 'final' } as TGameState,
      { type: 'ready' },
    );
    expect(final.kind).toBe('final');
  });

  it('round-trips every phase through a snapshot', () => {
    const q = initGame(config);
    expect(fromSnapshot(toSnapshot(q))).toEqual(q);

    const c = reduce(q, { type: 'ready' });
    // countdown resumes as the question (countdown re-runs)
    expect(fromSnapshot(toSnapshot(c))).toEqual(q);

    const r = reduce(reduce(c, { type: 'countdownDone' }), { type: 'confirm', result: 'match' });
    expect(fromSnapshot(toSnapshot(r))).toEqual(r);

    let s: TGameState = initGame(config);
    for (let i = 0; i < 5; i++) s = playQuestion(s, ['match', 'miss']);
    expect(s.kind).toBe('scoreboard');
    expect(fromSnapshot(toSnapshot(s))).toEqual(s);
  });

  it('ranks teams with the leader first and shared crown on ties', () => {
    const played = reduce(
      reduce(reduce(initGame(config), { type: 'ready' }), { type: 'countdownDone' }),
      { type: 'confirm', result: 'match' },
    );
    const ranked = rankTeams(played);
    expect(ranked[0]?.team.teamId).toBe('t1');
    expect(ranked[0]?.isWinner).toBe(true);

    const tied = rankTeams(initGame(config)); // 0-0
    expect(tied.every((r) => r.isWinner)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Flash
// ---------------------------------------------------------------------------

const flashRoster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A1', 'A2'] },
  { teamId: 't2', avatarId: 'lions', players: ['B1', 'B2'] },
];

function flashDeck(type: TQuestionType): TQuestion[] {
  return Array.from({ length: flashDeckSize(2) }, (_, i) => ({
    id: i + 1,
    theme: 'childhood' as const,
    difficulty: 'easy' as const,
    type,
    text: `q${i + 1}`,
  }));
}

function flashConfig(type: TQuestionType): TGameConfig {
  return { roster: flashRoster, mode: 'flash', difficulty: 'mix', themes: [], deck: flashDeck(type) };
}

/** Play a couple's full open-question sequence: pass → 3 answers → pass → 3 judged guesses. */
function playCoupleOpen(start: TGameState, answers: string[], verdicts: TVerdict[]): TGameState {
  let s = reduce(start, { type: 'passConfirm' }); // → secretInput
  for (const a of answers) s = reduce(s, { type: 'lockAnswer', answer: a }); // → passBack
  s = reduce(s, { type: 'passConfirm' }); // → guess
  for (const v of verdicts) {
    s = reduce(s, { type: 'reveal' });
    s = reduce(s, { type: 'judge', verdict: v });
  }
  return s;
}

describe('Flash machine', () => {
  it('helpers: deck index, size, role swap', () => {
    expect(flashDeckSize(2)).toBe(12);
    expect(flashDeckIndex(2, 0, 0, 0)).toBe(0);
    expect(flashDeckIndex(2, 0, 1, 2)).toBe(5);
    expect(flashDeckIndex(2, 1, 0, 0)).toBe(6);
    expect(answererIndex(0)).toBe(0);
    expect(answererIndex(1)).toBe(1);
  });

  it('starts at passSecret for round 0, couple 0', () => {
    const s = initGame(flashConfig('open'));
    expect(s.kind).toBe('passSecret');
    expect(s.scores).toEqual({ t1: 0, t2: 0 });
  });

  it('passSecret → secretInput → (3 locks) → passBack → guess', () => {
    let s: TGameState = initGame(flashConfig('open'));
    s = reduce(s, { type: 'passConfirm' });
    expect(s.kind).toBe('secretInput');
    s = reduce(s, { type: 'lockAnswer', answer: 'x' });
    s = reduce(s, { type: 'lockAnswer', answer: 'y' });
    expect(s.kind).toBe('secretInput');
    s = reduce(s, { type: 'lockAnswer', answer: 'z' });
    expect(s.kind).toBe('passBack');
    if (s.kind === 'passBack') expect(s.secretAnswers).toEqual({ '1': 'x', '2': 'y', '3': 'z' });
    s = reduce(s, { type: 'passConfirm' });
    expect(s.kind).toBe('guess');
  });

  it('open guess: reveal → judge scores +2 / +1 / 0 and advances', () => {
    const g0 = playCoupleOpen(initGame(flashConfig('open')), ['x', 'y', 'z'], ['exact', 'close', 'miss']);
    // couple 0 done its guess set (3 questions) → next couple's passSecret
    expect(g0.kind).toBe('passSecret');
    expect(g0.scores.t1).toBe(3); // 2 + 1 + 0
  });

  it('this_or_that auto-guess: match +2, mismatch 0', () => {
    let s: TGameState = initGame(flashConfig('this_or_that'));
    s = reduce(s, { type: 'passConfirm' });
    s = reduce(s, { type: 'lockAnswer', answer: 'Left' });
    s = reduce(s, { type: 'lockAnswer', answer: 'Right' });
    s = reduce(s, { type: 'lockAnswer', answer: 'Left' });
    s = reduce(s, { type: 'passConfirm' }); // → guess q0
    s = reduce(s, { type: 'autoGuess', guess: 'Left' }); // matches → +2
    s = reduce(s, { type: 'autoGuess', guess: 'Left' }); // truth Right → 0
    expect(s.kind).toBe('guess');
    s = reduce(s, { type: 'autoGuess', guess: 'Left' }); // matches → +2 → set done
    expect(s.kind).toBe('passSecret');
    expect(s.scores.t1).toBe(4); // 2 + 0 + 2
  });

  it('plays a full 2-couple game: round 0 → scoreboard → round 1 → final', () => {
    let s: TGameState = initGame(flashConfig('open'));
    s = playCoupleOpen(s, ['a', 'b', 'c'], ['exact', 'exact', 'exact']); // t1 +6
    expect(s.kind).toBe('passSecret'); // couple 1, round 0
    s = playCoupleOpen(s, ['a', 'b', 'c'], ['miss', 'miss', 'miss']); // t2 +0 → round 0 done
    expect(s.kind).toBe('scoreboard');
    s = reduce(s, { type: 'next' }); // → round 1 couple 0
    expect(s.kind).toBe('passSecret');
    if (s.kind === 'passSecret') expect(s.round).toBe(1);
    s = playCoupleOpen(s, ['a', 'b', 'c'], ['close', 'close', 'close']); // t1 +3
    s = playCoupleOpen(s, ['a', 'b', 'c'], ['exact', 'exact', 'exact']); // t2 +6 → final
    expect(s.kind).toBe('final');
    expect(s.scores).toEqual({ t1: 9, t2: 6 });
  });

  it('round-trips every Flash phase through a snapshot', () => {
    const pass = initGame(flashConfig('open'));
    expect(fromSnapshot(toSnapshot(pass))).toEqual(pass);

    const secret = reduce(reduce(pass, { type: 'passConfirm' }), { type: 'lockAnswer', answer: 'x' });
    expect(fromSnapshot(toSnapshot(secret))).toEqual(secret);

    let s: TGameState = reduce(secret, { type: 'lockAnswer', answer: 'y' });
    s = reduce(s, { type: 'lockAnswer', answer: 'z' }); // passBack
    expect(fromSnapshot(toSnapshot(s))).toEqual(s);
    const guess = reduce(s, { type: 'passConfirm' });
    expect(fromSnapshot(toSnapshot(guess))).toEqual(guess);
    const judge = reduce(guess, { type: 'reveal' });
    expect(fromSnapshot(toSnapshot(judge))).toEqual(judge);
  });
});
