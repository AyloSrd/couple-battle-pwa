import { describe, expect, it } from 'vitest';
import {
  initGame,
  reduce,
  toSnapshot,
  fromSnapshot,
  rankTeams,
  activeCouple,
  scoreboardAt,
  flashSharedIndex,
  flashDeckSize,
  answererIndex,
  nextFlashSlot,
  answerKey,
  flashQuestion,
  flashTruth,
  dilemmaQuestion,
  rapidQuestionOf,
  dilemmaOffset,
  rapidOffset,
  questionText,
  FLASH_SET,
  type TGameConfig,
  type TGameEvent,
  type TGameState,
  type TResult,
  type TVerdict,
} from './machine';
import { AVATAR_IDS, type TMode, type TRoster } from '@/shared/game/domain/types';
import type { TQuestion, TQuestionType } from '@/shared/questions/domain/types';
import { deckSizeFor } from '@/shared/questions/domain/services';
import { ZGameSnapshotSchema } from '@/shared/save/domain/types';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
  { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
];

const deck: TQuestion[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  theme: 'childhood',
  difficulty: 'easy',
  type: 'who_of_two',
  // who_of_two: identical group phrasings, no placeholder.
  you: `q${i + 1}`,
  name: `q${i + 1}`,
}));

const config: TGameConfig = { roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck };

/** Play one whole question: ready → countdown → each couple confirms. */
function playQuestion(state: TGameState, results: TResult[]): TGameState {
  let s = reduce(state, { type: 'ready' });
  s = reduce(s, { type: 'countdownDone' });
  for (const result of results) s = reduce(s, { type: 'confirm', result });
  return s;
}

describe('questionText — addressee variant per screen', () => {
  const q: TQuestion = {
    id: 1,
    theme: 'foodDrinks',
    difficulty: 'easy',
    type: 'open',
    you: "C'est quoi ton petit-déj classique ?",
    name: "C'est quoi le petit-déj classique de {name} ?",
  };
  const whoOfTwo: TQuestion = {
    id: 2,
    theme: 'random',
    difficulty: 'easy',
    type: 'who_of_two',
    you: 'Qui de vous deux ronfle le plus ?',
    name: 'Qui de vous deux ronfle le plus ?',
  };

  it('secret screen renders the "you" variant verbatim', () => {
    expect(questionText(q, 'you')).toBe("C'est quoi ton petit-déj classique ?");
  });

  it('guess/judge render the "name" variant with the answerer interpolated', () => {
    expect(questionText(q, 'name', 'Morgane')).toBe("C'est quoi le petit-déj classique de Morgane ?");
  });

  it('leaves no {name} slot once interpolated', () => {
    expect(questionText(q, 'name', 'Luca')).not.toContain('{name}');
  });

  it('who_of_two: both variants are the identical group phrasing', () => {
    expect(questionText(whoOfTwo, 'you')).toBe(questionText(whoOfTwo, 'name', 'Anyone'));
  });

  it('missing question renders empty (never crashes a screen)', () => {
    expect(questionText(undefined, 'you')).toBe('');
    expect(questionText(undefined, 'name', 'X')).toBe('');
  });
});

describe('Dilemma machine', () => {
  it('initGame starts everyone at zero on the first question', () => {
    const s = initGame(config);
    expect(s.kind).toBe('question');
    expect(s.scores).toEqual({ t1: 0, t2: 0 });
  });

  it('scoreboardAt is the halfway point', () => {
    expect(scoreboardAt('dilemma', 10)).toBe(5);
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
// Flash — "sofa sides" (shared questions, interleaved by question)
// ---------------------------------------------------------------------------

const flashRoster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A1', 'A2'] },
  { teamId: 't2', avatarId: 'lions', players: ['B1', 'B2'] },
];
const soloRoster: TRoster = [{ teamId: 't1', avatarId: 'otters', players: ['A1', 'A2'] }];

/** The shared block: 2 questions × 2 rounds, whatever the couple count. */
function flashDeck(type: TQuestionType): TQuestion[] {
  return Array.from({ length: flashDeckSize() }, (_, i) => ({
    id: i + 1,
    theme: 'childhood' as const,
    difficulty: 'easy' as const,
    type,
    you: `q${i + 1}`,
    name: `q${i + 1} de {name}`,
  }));
}

function flashConfig(type: TQuestionType, roster: TRoster = flashRoster): TGameConfig {
  return { roster, mode: 'flash', difficulty: 'mix', themes: [], deck: flashDeck(type) };
}

type TSlotFn<T> = (questionIdx: number, coupleIdx: number) => T;

/** A slot's (questionIdx, coupleIdx) for assertions. */
function slotOf(s: TGameState): [number, number] | null {
  return 'questionIdx' in s && 'coupleIdx' in s ? [s.questionIdx, s.coupleIdx] : null;
}

/**
 * Drive the COLLECT phase from a `sideAnswerers` gate: gate → per slot
 * [(handoff if ≥2 couples) → secretInput → lock] → `sideGuessers`.
 * Asserts the iteration order (coupleIdx fastest, then questionIdx).
 */
function collectRound(start: TGameState, answerAt: TSlotFn<string>): TGameState {
  expect(start.kind).toBe('sideAnswerers');
  const n = start.roster.length;
  let s = reduce(start, { type: 'passConfirm' });
  for (let q = 0; q < FLASH_SET; q++) {
    for (let c = 0; c < n; c++) {
      if (n > 1) {
        expect(s.kind).toBe('handoff');
        expect(slotOf(s)).toEqual([q, c]);
        s = reduce(s, { type: 'passConfirm' });
      }
      expect(s.kind).toBe('secretInput');
      expect(slotOf(s)).toEqual([q, c]);
      s = reduce(s, { type: 'lockAnswer', answer: answerAt(q, c) });
    }
  }
  expect(s.kind).toBe('sideGuessers');
  return s;
}

/** Drive the GUESS phase from a `sideGuessers` gate with judged verdicts. */
function guessRound(start: TGameState, verdictAt: TSlotFn<TVerdict>): TGameState {
  expect(start.kind).toBe('sideGuessers');
  const n = start.roster.length;
  let s = reduce(start, { type: 'passConfirm' });
  for (let q = 0; q < FLASH_SET; q++) {
    for (let c = 0; c < n; c++) {
      expect(s.kind).toBe('guess');
      expect(slotOf(s)).toEqual([q, c]);
      s = reduce(s, { type: 'reveal' });
      expect(s.kind).toBe('judge');
      s = reduce(s, { type: 'judge', verdict: verdictAt(q, c) });
    }
  }
  return s;
}

function playRound(start: TGameState, answerAt: TSlotFn<string>, verdictAt: TSlotFn<TVerdict>): TGameState {
  return guessRound(collectRound(start, answerAt), verdictAt);
}

const always =
  <T,>(v: T): TSlotFn<T> =>
  () =>
    v;

describe('Flash machine — sofa sides', () => {
  it('helpers: shared deck, slot order, role swap, offsets', () => {
    expect(flashDeckSize()).toBe(4); // 2 shared × 2 rounds, regardless of couples
    expect(flashSharedIndex(0, 0)).toBe(0);
    expect(flashSharedIndex(0, 1)).toBe(1);
    expect(flashSharedIndex(1, 0)).toBe(2);
    expect(flashSharedIndex(1, 1)).toBe(3);
    expect(answererIndex(0)).toBe(0);
    expect(answererIndex(1)).toBe(1);
    // coupleIdx fastest, then questionIdx, then the phase is done
    expect(nextFlashSlot(2, 0, 0)).toEqual({ questionIdx: 0, coupleIdx: 1 });
    expect(nextFlashSlot(2, 0, 1)).toEqual({ questionIdx: 1, coupleIdx: 0 });
    expect(nextFlashSlot(2, 1, 1)).toBeNull();
    expect(nextFlashSlot(1, 0, 0)).toEqual({ questionIdx: 1, coupleIdx: 0 });
    expect(nextFlashSlot(1, 1, 0)).toBeNull();
    expect(answerKey('t1', 7)).toBe('t1|7');
    expect(dilemmaOffset('flash')).toBe(0);
    expect(dilemmaOffset('ultime')).toBe(4);
    expect(rapidOffset()).toBe(9);
  });

  it('opens on the answerers group gate, round 0, everyone at zero', () => {
    const s = initGame(flashConfig('open'));
    expect(s.kind).toBe('sideAnswerers');
    if (s.kind === 'sideAnswerers') expect(s.round).toBe(0);
    expect(s.scores).toEqual({ t1: 0, t2: 0 });
  });

  it('collect phase: gate → light handoff → input, interleaved by question (Q1 all couples, then Q2)', () => {
    const order: string[] = [];
    let s = reduce(initGame(flashConfig('open')), { type: 'passConfirm' });
    while (s.kind === 'handoff' || s.kind === 'secretInput') {
      order.push(`${s.kind}:${s.questionIdx}${s.coupleIdx}`);
      s = s.kind === 'handoff' ? reduce(s, { type: 'passConfirm' }) : reduce(s, { type: 'lockAnswer', answer: 'a' });
    }
    expect(order).toEqual([
      'handoff:00', 'secretInput:00',
      'handoff:01', 'secretInput:01',
      'handoff:10', 'secretInput:10',
      'handoff:11', 'secretInput:11',
    ]);
    expect(s.kind).toBe('sideGuessers'); // the phone crosses the sofa
  });

  it('the two questions are SHARED: every couple sees the same ids in a round', () => {
    let s = reduce(initGame(flashConfig('open')), { type: 'passConfirm' });
    s = reduce(s, { type: 'passConfirm' }); // → secretInput (0,0)
    const q00 = flashQuestion(s)?.id;
    s = reduce(reduce(s, { type: 'lockAnswer', answer: 'a' }), { type: 'passConfirm' }); // → (0,1)
    expect(flashQuestion(s)?.id).toBe(q00);
    s = reduce(reduce(s, { type: 'lockAnswer', answer: 'a' }), { type: 'passConfirm' }); // → (1,0)
    const q10 = flashQuestion(s)?.id;
    expect(q10).not.toBe(q00);
    s = reduce(reduce(s, { type: 'lockAnswer', answer: 'a' }), { type: 'passConfirm' }); // → (1,1)
    expect(flashQuestion(s)?.id).toBe(q10);
  });

  it('answers are keyed per (couple, question) and all coexist for the round', () => {
    const s = collectRound(initGame(flashConfig('open')), (q, c) => `c${c}q${q}`);
    if (s.kind === 'sideGuessers') {
      expect(s.secretAnswers).toEqual({
        't1|1': 'c0q0',
        't2|1': 'c1q0',
        't1|2': 'c0q1',
        't2|2': 'c1q1',
      });
    }
  });

  it('guess phase: gate → guess/judge interleaved by question, then scoreboard; scores per couple', () => {
    const collected = collectRound(initGame(flashConfig('open')), always('a'));
    // t1: exact, close → 3 · t2: miss, exact → 2
    const s = guessRound(collected, (q, c) => (c === 0 ? (q === 0 ? 'exact' : 'close') : q === 0 ? 'miss' : 'exact'));
    expect(s.kind).toBe('scoreboard');
    if (s.kind === 'scoreboard') expect(s.round).toBe(0);
    expect(s.scores).toEqual({ t1: 3, t2: 2 });
  });

  it('judge sees the RIGHT couple\'s locked answer for the slot', () => {
    let s = reduce(collectRound(initGame(flashConfig('open')), (q, c) => `c${c}q${q}`), { type: 'passConfirm' });
    expect(flashTruth(s)).toBe('c0q0'); // guess (0,0) → couple 0's Q1
    s = reduce(reduce(s, { type: 'reveal' }), { type: 'judge', verdict: 'miss' });
    expect(flashTruth(s)).toBe('c1q0'); // (0,1) → couple 1's Q1
    s = reduce(reduce(s, { type: 'reveal' }), { type: 'judge', verdict: 'miss' });
    expect(flashTruth(s)).toBe('c0q1'); // (1,0) → couple 0's Q2
  });

  it('auto-guess (this_or_that) compares against the slot couple\'s own answer', () => {
    // t1 answered Left to both, t2 answered Right to both
    const collected = collectRound(initGame(flashConfig('this_or_that')), (_q, c) => (c === 0 ? 'Left' : 'Right'));
    let s = reduce(collected, { type: 'passConfirm' });
    s = reduce(s, { type: 'autoGuess', guess: 'Left' }); // (0,0) t1 truth Left → +2
    s = reduce(s, { type: 'autoGuess', guess: 'Left' }); // (0,1) t2 truth Right → 0
    s = reduce(s, { type: 'autoGuess', guess: 'Right' }); // (1,0) t1 truth Left → 0
    s = reduce(s, { type: 'autoGuess', guess: 'Right' }); // (1,1) t2 truth Right → +2
    expect(s.kind).toBe('scoreboard');
    expect(s.scores).toEqual({ t1: 2, t2: 2 });
  });

  it('plays a full 2-couple game: round 0 → scoreboard → round 1 (roles swapped) → final', () => {
    let s: TGameState = initGame(flashConfig('open'));
    s = playRound(s, always('a'), (_q, c) => (c === 0 ? 'exact' : 'miss')); // t1 +4
    expect(s.kind).toBe('scoreboard');
    s = reduce(s, { type: 'next' });
    expect(s.kind).toBe('sideAnswerers');
    if (s.kind === 'sideAnswerers') expect(s.round).toBe(1);
    s = playRound(s, always('a'), (_q, c) => (c === 0 ? 'close' : 'exact')); // t1 +2, t2 +4
    expect(s.kind).toBe('final');
    expect(s.scores).toEqual({ t1: 6, t2: 4 });
  });

  it('a new round starts with the previous round\'s answers cleared', () => {
    let s: TGameState = initGame(flashConfig('open'));
    s = reduce(playRound(s, always('a'), always('exact')), { type: 'next' }); // → round 1 gate
    s = reduce(reduce(s, { type: 'passConfirm' }), { type: 'passConfirm' }); // handoff → secretInput (0,0)
    expect(s.kind).toBe('secretInput');
    if (s.kind === 'secretInput') expect(s.secretAnswers).toEqual({});
  });

  it('round 1 draws the second shared pair', () => {
    let s: TGameState = initGame(flashConfig('open'));
    s = reduce(playRound(s, always('a'), always('exact')), { type: 'next' });
    s = reduce(reduce(s, { type: 'passConfirm' }), { type: 'passConfirm' }); // secretInput (0,0) round 1
    expect(flashQuestion(s)?.id).toBe(3); // ids 1,2 were round 0
  });

  it('solo (1 couple) degenerates: no handoff, gates are the strict pass screens, Q1 Q2 → guess Q1 Q2', () => {
    let s: TGameState = initGame(flashConfig('open', soloRoster));
    expect(s.kind).toBe('sideAnswerers');
    s = reduce(s, { type: 'passConfirm' });
    expect(s.kind).toBe('secretInput'); // straight in — nobody to hand the phone to
    expect(slotOf(s)).toEqual([0, 0]);
    s = reduce(s, { type: 'lockAnswer', answer: 'x' });
    expect(s.kind).toBe('secretInput');
    expect(slotOf(s)).toEqual([1, 0]);
    s = reduce(s, { type: 'lockAnswer', answer: 'y' });
    expect(s.kind).toBe('sideGuessers');
    s = guessRound(s, always('exact')); // +4
    expect(s.kind).toBe('scoreboard');
    s = reduce(s, { type: 'next' });
    s = collectRound(s, always('z'));
    s = guessRound(s, always('close')); // +2
    expect(s.kind).toBe('final');
    expect(s.scores).toEqual({ t1: 6 });
  });

  describe('a judged slot\'s secret leaves the state (and the snapshot)', () => {
    // 2 couples, both answered both shared questions: t1|1 t2|1 t1|2 t2|2.
    const locked = () => reduce(collectRound(initGame(flashConfig('this_or_that')), (q, c) => `c${c}q${q}`), { type: 'passConfirm' });

    it('judge drops only the judged (couple, question) key', () => {
      const guess = locked();
      const judge = reduce(guess, { type: 'reveal' });
      expect(judge.kind).toBe('judge');
      const before = structuredClone(judge);

      const next = reduce(judge, { type: 'judge', verdict: 'exact' }); // slot (0,0) = t1|1
      expect(next.kind).toBe('guess');
      if (next.kind === 'guess') {
        expect(next.secretAnswers).toEqual({ 't2|1': 'c1q0', 't1|2': 'c0q1', 't2|2': 'c1q1' });
      }
      expect(toSnapshot(next).secretAnswers).not.toHaveProperty('t1|1');
      expect(judge).toEqual(before); // incoming state not mutated
      if (judge.kind === 'judge') expect(judge.secretAnswers).toHaveProperty('t1|1', 'c0q0');

      // next slot (0,1) = t2|1: the other couple's answer to the SAME question
      const after = reduce(reduce(next, { type: 'reveal' }), { type: 'judge', verdict: 'miss' });
      if (after.kind === 'guess') expect(after.secretAnswers).toEqual({ 't1|2': 'c0q1', 't2|2': 'c1q1' });
    });

    it('autoGuess drops only the judged (couple, question) key', () => {
      const guess = locked();
      const before = structuredClone(guess);

      const next = reduce(guess, { type: 'autoGuess', guess: 'c0q0' }); // slot (0,0) = t1|1
      expect(next.kind).toBe('guess');
      expect(next.scores).toEqual({ t1: 2, t2: 0 }); // judged against the truth before dropping it
      if (next.kind === 'guess') {
        expect(next.secretAnswers).toEqual({ 't2|1': 'c1q0', 't1|2': 'c0q1', 't2|2': 'c1q1' });
      }
      expect(guess).toEqual(before); // incoming state not mutated
      if (guess.kind === 'guess') expect(guess.secretAnswers).toHaveProperty('t1|1', 'c0q0');
    });
  });

  it('mid-phase resume: every Flash state round-trips through a snapshot with locked answers intact', () => {
    const gate = initGame(flashConfig('open'));
    expect(fromSnapshot(toSnapshot(gate))).toEqual(gate);

    let s = reduce(gate, { type: 'passConfirm' }); // handoff (0,0)
    expect(fromSnapshot(toSnapshot(s))).toEqual(s);
    s = reduce(s, { type: 'passConfirm' }); // secretInput (0,0)
    s = reduce(s, { type: 'lockAnswer', answer: 'a' }); // handoff (0,1) with 1 locked
    expect(fromSnapshot(toSnapshot(s))).toEqual(s);
    s = reduce(reduce(s, { type: 'passConfirm' }), { type: 'lockAnswer', answer: 'b' }); // handoff (1,0), 2 locked
    s = reduce(s, { type: 'passConfirm' }); // secretInput (1,0)
    expect(fromSnapshot(toSnapshot(s))).toEqual(s);
    if (s.kind === 'secretInput') expect(Object.keys(s.secretAnswers)).toHaveLength(2);

    s = reduce(reduce(reduce(s, { type: 'lockAnswer', answer: 'c' }), { type: 'passConfirm' }), { type: 'lockAnswer', answer: 'd' });
    expect(s.kind).toBe('sideGuessers');
    expect(fromSnapshot(toSnapshot(s))).toEqual(s);

    const guess = reduce(s, { type: 'passConfirm' });
    expect(fromSnapshot(toSnapshot(guess))).toEqual(guess);
    const judge = reduce(guess, { type: 'reveal' });
    expect(fromSnapshot(toSnapshot(judge))).toEqual(judge);
    if (judge.kind === 'judge') expect(Object.keys(judge.secretAnswers)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Ultime (composition)
// ---------------------------------------------------------------------------

function ultimeConfig(): TGameConfig {
  const size = 4 + 5 + 5 * 2; // shared flash 4 + dilemma 5 + rapid 5N, N=2 → 19
  const deck: TQuestion[] = Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    theme: 'childhood' as const,
    difficulty: 'easy' as const,
    type: 'open' as const,
    you: `q${i + 1}`,
    name: `q${i + 1} de {name}`,
  }));
  return { roster: flashRoster, mode: 'ultime', difficulty: 'mix', themes: [], deck };
}

function ultimeDilemmaQ(start: TGameState, results: TResult[]): TGameState {
  let s = reduce(start, { type: 'ready' });
  s = reduce(s, { type: 'countdownDone' });
  for (const r of results) s = reduce(s, { type: 'confirm', result: r });
  return s;
}
function ultimeRapidCouple(start: TGameState, synchros: boolean[]): TGameState {
  let s = reduce(start, { type: 'next' }); // rapidTurn → rapidQuestion
  for (const syn of synchros) {
    s = reduce(s, { type: 'ready' });
    s = reduce(s, { type: 'countdownDone' });
    s = reduce(s, { type: 'rapidJudge', synchro: syn });
  }
  return s;
}

describe('Ultime machine (composition)', () => {
  it('opens on the shared-Flash answerers gate', () => {
    const s = initGame(ultimeConfig());
    expect(s.kind).toBe('sideAnswerers');
    if (s.kind === 'sideAnswerers') expect(s.round).toBe(0);
  });

  it('plays sofa-side flash rounds → dilemma → rapid-fire → final with scoreboards between', () => {
    let s: TGameState = initGame(ultimeConfig());

    // Flash round 0 (2 shared questions): t1 exact ×2 = 4, t2 miss = 0
    s = playRound(s, always('a'), (_q, c) => (c === 0 ? 'exact' : 'miss'));
    expect(s.kind).toBe('scoreboard');
    if (s.kind === 'scoreboard') expect(s.round).toBe(0);

    s = reduce(s, { type: 'next' }); // → flash round 1
    expect(s.kind).toBe('sideAnswerers');
    if (s.kind === 'sideAnswerers') expect(s.round).toBe(1);
    s = playRound(s, always('a'), always('exact')); // +4 each
    expect(s.kind).toBe('scoreboard');

    s = reduce(s, { type: 'next' }); // → dilemma segment, right after the shared block
    expect(s.kind).toBe('question');
    expect(dilemmaQuestion(s)?.id).toBe(5);
    for (let i = 0; i < 5; i++) s = ultimeDilemmaQ(s, ['match', 'miss']); // t1 +5
    expect(s.kind).toBe('scoreboard');

    s = reduce(s, { type: 'next' }); // → rapid-fire
    expect(s.kind).toBe('rapidIntro');
    s = reduce(s, { type: 'next' });
    expect(s.kind).toBe('rapidTurn');
    const rq = reduce(s, { type: 'next' });
    expect(rapidQuestionOf(rq)?.id).toBe(10); // after flash 4 + dilemma 5
    s = ultimeRapidCouple(s, [true, true, true, true, true]); // t1 +10
    expect(s.kind).toBe('rapidTurn');
    s = ultimeRapidCouple(s, [true, false, true, false, true]); // t2 +6 → final
    expect(s.kind).toBe('final');

    expect(s.scores).toEqual({ t1: 4 + 4 + 5 + 10, t2: 0 + 4 + 0 + 6 });
  });

  it('round-trips rapid-fire phases through a snapshot', () => {
    const base = initGame(ultimeConfig());
    const rapidTurn: TGameState = {
      kind: 'rapidTurn',
      coupleIdx: 1,
      roster: base.roster,
      mode: base.mode,
      difficulty: base.difficulty,
      themes: base.themes,
      deck: base.deck,
      scores: base.scores,
    };
    expect(fromSnapshot(toSnapshot(rapidTurn))).toEqual(rapidTurn);
    const rq = reduce(rapidTurn, { type: 'next' });
    expect(fromSnapshot(toSnapshot(rq))).toEqual(rq);
  });
});

// ---------------------------------------------------------------------------
// Persisted-schema round-trip: every real state must be saveable
// ---------------------------------------------------------------------------

/** The one deterministic event each non-final kind advances on. */
const SCRIPT: Record<Exclude<TGameState['kind'], 'final'>, TGameEvent> = {
  question: { type: 'ready' },
  countdown: { type: 'countdownDone' },
  resolve: { type: 'confirm', result: 'match' },
  sideAnswerers: { type: 'passConfirm' },
  handoff: { type: 'passConfirm' },
  // Longest answer the secret input allows (maxLength 40).
  secretInput: { type: 'lockAnswer', answer: 'x'.repeat(40) },
  sideGuessers: { type: 'passConfirm' },
  guess: { type: 'reveal' },
  judge: { type: 'judge', verdict: 'exact' },
  rapidIntro: { type: 'next' },
  rapidTurn: { type: 'next' },
  rapidQuestion: { type: 'ready' },
  rapidCountdown: { type: 'countdownDone' },
  rapidJudge: { type: 'rapidJudge', synchro: true },
  scoreboard: { type: 'next' },
};

/** A real roster: teamIds t1..tN (as Setup assigns them), 16-char names (the input cap). */
function realRoster(n: number): TRoster {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i + 1}`,
    avatarId: AVATAR_IDS[i]!,
    players: [`P${i + 1}a`.padEnd(16, '_'), `P${i + 1}b`.padEnd(16, '_')] as [string, string],
  }));
}

/** Catalog-like ids (the real catalog tops out at 1035). */
function realDeck(mode: TMode, size: number): TQuestion[] {
  return Array.from({ length: size }, (_, i) => ({
    id: 1000 + i,
    theme: 'childhood' as const,
    difficulty: 'easy' as const,
    type: mode === 'dilemma' ? ('who_of_two' as const) : ('open' as const),
    you: `q${i}`,
    name: `q${i} de {name}`,
  }));
}

/** True when a question-bearing state's cursor points past the end of the deck. */
function pointsPastDeck(state: TGameState): boolean {
  switch (state.kind) {
    case 'handoff':
    case 'secretInput':
    case 'guess':
    case 'judge':
      return flashQuestion(state) === undefined;
    case 'question':
    case 'resolve':
      return dilemmaQuestion(state) === undefined;
    case 'rapidQuestion':
    case 'rapidCountdown':
    case 'rapidJudge':
      return rapidQuestionOf(state) === undefined;
    default:
      return false;
  }
}

/** Drive a game to `final`, asserting the snapshot schema after every transition. */
function playToFinalCheckingSnapshots(config: TGameConfig): { maxQuestionIdx: number; pastDeck: boolean } {
  let s = initGame(config);
  let maxQuestionIdx = 0;
  let pastDeck = false;
  const check = (state: TGameState) => {
    const snapshot = toSnapshot(state);
    const result = ZGameSnapshotSchema.safeParse(snapshot);
    expect(result.success, `snapshot rejected in "${state.kind}": ${result.error?.message ?? ''}`).toBe(true);
    maxQuestionIdx = Math.max(maxQuestionIdx, snapshot.cursor.questionIdx);
    pastDeck ||= pointsPastDeck(state);
  };
  check(s);
  for (let step = 0; s.kind !== 'final'; step++) {
    if (step > 1000) throw new Error(`no final after 1000 steps (stuck in "${s.kind}")`);
    const next = reduce(s, SCRIPT[s.kind]);
    if (next === s) throw new Error(`no progress from "${s.kind}"`);
    s = next;
    check(s);
  }
  return { maxQuestionIdx, pastDeck };
}

describe('every real state fits the persisted snapshot schema', () => {
  const modes: TMode[] = ['flash', 'dilemma', 'ultime'];
  const cases = modes.flatMap((mode) => [1, 2, 3, 4].map((couples) => [mode, couples] as const));

  it.each(cases)('%s with %i couple(s), nominal deck', (mode, couples) => {
    const deck = realDeck(mode, deckSizeFor(mode, couples));
    playToFinalCheckingSnapshots({ roster: realRoster(couples), mode, difficulty: 'mix', themes: [], deck });
  });

  const shortCases = (['flash', 'ultime'] as const).flatMap((mode) =>
    [1, 4].flatMap((couples) => [1, 2].map((size) => [mode, couples, size] as const)),
  );

  it.each(shortCases)('%s with %i couple(s), short deck of %i', (mode, couples, size) => {
    const deck = realDeck(mode, size);
    const { maxQuestionIdx, pastDeck } = playToFinalCheckingSnapshots({
      roster: realRoster(couples),
      mode,
      difficulty: 'mix',
      themes: [],
      deck,
    });
    // The cursor legitimately runs past the end of a short deck…
    expect(pastDeck).toBe(true);
    // …and in Ultime the persisted questionIdx itself exceeds deck.length
    // (Dilemma segment is always 5), which the schema must not reject.
    if (mode === 'ultime') expect(maxQuestionIdx).toBeGreaterThan(deck.length);
  });
});
