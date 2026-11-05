import { describe, expect, it } from 'vitest';
import {
  reduce,
  rankTeams,
  teamOf,
  cardOf,
  deckIndexOf,
  secretOf,
  flashRound,
  rapidSubjectIndex,
  nextFlashSlot,
  questionText,
  type TGameEventBody,
  type TVerdict,
} from './machine';
import {
  FLASH_SET,
  SECRET_MAX,
  ZGameSchema,
  answerKey,
  answererIndex,
  isGameConsistent,
  newGame,
  planOf,
  type TDeckCard,
  type TGame,
  type TNewGameConfig,
  type TStep,
  type TStepKind,
} from '@/shared/game/domain/game';
import { AVATAR_IDS, type TMode, type TRoster } from '@/shared/game/domain/types';
import type { TQuestion, TQuestionType } from '@/shared/questions/domain/types';
import { deckSizeFor } from '@/shared/questions/domain/services';

/** Apply events in order, each carrying the seq of the game it is applied to (as useGame does). */
function play(game: TGame, ...events: TGameEventBody[]): TGame {
  return events.reduce((g, e) => reduce(g, { ...e, seq: g.ctx.seq }), game);
}
const NEXT: TGameEventBody = { type: 'next' };
const verdict = (v: TVerdict): TGameEventBody => ({ type: 'verdict', v });
const answer = (value: string): TGameEventBody => ({ type: 'answer', value });
const guess = (value: string): TGameEventBody => ({ type: 'guess', value });
/** A game at an arbitrary step (for screens / helpers that need one without driving there). */
const at = (game: TGame, step: TStep, seg = game.ctx.seg): TGame => ({ ctx: { ...game.ctx, seg }, step });

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
  { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
];

const deck: TDeckCard[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, type: 'who_of_two' }));

const config: TNewGameConfig = { roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck };

/** Play one whole question: next (after the UI countdown) → each couple's verdict. */
function playQuestion(game: TGame, results: ('exact' | 'miss')[]): TGame {
  return play(game, NEXT, ...results.map(verdict));
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
  it('newGame starts everyone at zero on the first question', () => {
    const g = newGame(config);
    expect(g.step).toEqual({ kind: 'ask', q: 0 });
    expect(g.ctx.scores).toEqual({ t1: 0, t2: 0 });
  });

  it('the halfway board is planned for standalone Dilemma, at floor(count / 2)', () => {
    expect(planOf('dilemma', 10)).toEqual([{ kind: 'dilemma', from: 0, count: 10, halfway: true }]);
    let g = newGame(config);
    for (let i = 0; i < 5; i++) g = playQuestion(g, ['exact', 'miss']);
    expect(g.step).toEqual({ kind: 'scoreboard', resumeQ: 5 });
  });

  it('ask → resolve on next (and ignores other events); the countdown is a UI beat', () => {
    const q = newGame(config);
    expect(reduce(q, { type: 'verdict', v: 'exact', seq: 0 })).toBe(q);
    const r = play(q, NEXT);
    expect(r.step.kind).toBe('resolve');
    expect(r.ctx.scores).toEqual(q.ctx.scores);
  });

  it('ask → resolve (active couple 0)', () => {
    const r = play(newGame(config), NEXT);
    expect(r.step.kind).toBe('resolve');
    if (r.step.kind === 'resolve') {
      expect(r.step.couple).toBe(0);
      expect(r.step.results).toEqual({});
    }
    expect(teamOf(r)?.teamId).toBe('t1');
  });

  it('resolve advances couple-by-couple, scoring matches only', () => {
    const r0 = play(newGame(config), NEXT);
    const r1 = play(r0, verdict('exact')); // t1 matches
    expect(r1.step.kind).toBe('resolve');
    if (r1.step.kind === 'resolve') {
      expect(r1.step.couple).toBe(1);
      expect(teamOf(r1)?.teamId).toBe('t2');
      expect(r1.ctx.scores.t1).toBe(1);
      expect(r1.step.results).toEqual({ t1: 'match' });
    }
    const q2 = play(r1, verdict('miss')); // t2 misses → last couple → next question
    expect(q2.step.kind).toBe('ask');
    expect(q2.ctx.scores).toEqual({ t1: 1, t2: 0 });
    if (q2.step.kind === 'ask') expect(q2.step.q).toBe(1);
  });

  it('shows the scoreboard after the 5th question, then continues', () => {
    let g = newGame(config);
    for (let i = 0; i < 4; i++) g = playQuestion(g, ['exact', 'miss']); // Q1..Q4
    expect(g.step.kind).toBe('ask');
    g = playQuestion(g, ['exact', 'exact']); // Q5 done → scoreboard
    expect(g.step.kind).toBe('scoreboard');
    if (g.step.kind === 'scoreboard') expect(g.step.resumeQ).toBe(5);
    const q6 = play(g, NEXT);
    expect(q6.step.kind).toBe('ask');
    if (q6.step.kind === 'ask') expect(q6.step.q).toBe(5);
  });

  it('reaches the final after the 10th question', () => {
    let g = newGame(config);
    for (let i = 0; i < 5; i++) g = playQuestion(g, ['exact', 'miss']); // Q1..Q5
    g = play(g, NEXT); // past scoreboard → Q6
    for (let i = 0; i < 4; i++) g = playQuestion(g, ['exact', 'miss']); // Q6..Q9
    expect(g.step.kind).toBe('ask');
    g = playQuestion(g, ['miss', 'exact']); // Q10 → final
    expect(g.step.kind).toBe('final');
    expect(g.ctx.scores.t1).toBe(9); // matched Q1-9, missed Q10
    expect(g.ctx.scores.t2).toBe(1); // missed Q1-9, matched Q10
  });

  it('final and scoreboard ignore unrelated events; final is terminal', () => {
    const final = at(newGame(config), { kind: 'final' });
    expect(play(final, NEXT)).toBe(final);
    expect(play(final, NEXT).step.kind).toBe('final');
  });

  it('every phase is a valid persisted game (resume lands on the stored step)', () => {
    const q = newGame(config);
    expect(ZGameSchema.parse(q)).toEqual(q);
    const r = play(q, NEXT, verdict('exact'));
    expect(ZGameSchema.parse(r)).toEqual(r);
    let g = q;
    for (let i = 0; i < 5; i++) g = playQuestion(g, ['exact', 'miss']);
    expect(g.step.kind).toBe('scoreboard');
    expect(ZGameSchema.parse(g)).toEqual(g);
  });

  it('ranks teams with the leader first and shared crown on ties', () => {
    const played = play(newGame(config), NEXT, verdict('exact'));
    const ranked = rankTeams(played.ctx);
    expect(ranked[0]?.team.teamId).toBe('t1');
    expect(ranked[0]?.isWinner).toBe(true);

    const tied = rankTeams(newGame(config).ctx); // 0-0
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
function flashDeck(type: TQuestionType | TQuestionType[]): TDeckCard[] {
  return Array.from({ length: 2 * FLASH_SET }, (_, i) => ({ id: i + 1, type: Array.isArray(type) ? type[i]! : type }));
}

function flashConfig(type: TQuestionType | TQuestionType[], r: TRoster = flashRoster): TNewGameConfig {
  return { roster: r, mode: 'flash', difficulty: 'mix', themes: [], deck: flashDeck(type) };
}

type TSlotFn<T> = (q: number, couple: number) => T;

/** A slot's (q, couple) for assertions. */
function slotOf(g: TGame): [number, number] | null {
  return 'q' in g.step && 'couple' in g.step ? [g.step.q, g.step.couple] : null;
}
const secretsOf = (g: TGame) => ('secrets' in g.step ? g.step.secrets : undefined);

/**
 * Drive the COLLECT phase from an answerers gate: gate → per slot
 * [(handoff if ≥2 couples) → secret → answer] → guessers gate.
 * Asserts the iteration order (couple fastest, then question).
 */
function collectRound(start: TGame, answerAt: TSlotFn<string>): TGame {
  expect(start.step).toMatchObject({ kind: 'gate', side: 'answerers' });
  const n = start.ctx.roster.length;
  let g = play(start, NEXT);
  for (let q = 0; q < FLASH_SET; q++) {
    for (let c = 0; c < n; c++) {
      if (n > 1) {
        expect(g.step.kind).toBe('handoff');
        expect(slotOf(g)).toEqual([q, c]);
        g = play(g, NEXT);
      }
      expect(g.step.kind).toBe('secret');
      expect(slotOf(g)).toEqual([q, c]);
      g = play(g, answer(answerAt(q, c)));
    }
  }
  expect(g.step).toMatchObject({ kind: 'gate', side: 'guessers' });
  return g;
}

/** Drive the GUESS phase from a guessers gate with judged verdicts. */
function guessRound(start: TGame, verdictAt: TSlotFn<TVerdict>): TGame {
  expect(start.step).toMatchObject({ kind: 'gate', side: 'guessers' });
  const n = start.ctx.roster.length;
  let g = play(start, NEXT);
  for (let q = 0; q < FLASH_SET; q++) {
    for (let c = 0; c < n; c++) {
      expect(g.step.kind).toBe('guess');
      expect(slotOf(g)).toEqual([q, c]);
      g = play(g, NEXT);
      expect(g.step.kind).toBe('judge');
      g = play(g, verdict(verdictAt(q, c)));
    }
  }
  return g;
}

function playRound(start: TGame, answerAt: TSlotFn<string>, verdictAt: TSlotFn<TVerdict>): TGame {
  return guessRound(collectRound(start, answerAt), verdictAt);
}

const always =
  <T,>(v: T): TSlotFn<T> =>
  () =>
    v;

describe('Flash machine — sofa sides', () => {
  it('helpers: shared deck, slot order, role swap, offsets', () => {
    for (const n of [1, 2, 3, 4]) expect(deckSizeFor('flash', n)).toBe(4); // 2 shared × 2 rounds
    const g = newGame(flashConfig('open'));
    const slotIndex = (seg: number, q: number) => deckIndexOf(at(g, { kind: 'secret', q, couple: 0, secrets: {} }, seg));
    expect(slotIndex(0, 0)).toBe(0);
    expect(slotIndex(0, 1)).toBe(1);
    expect(slotIndex(1, 0)).toBe(2);
    expect(slotIndex(1, 1)).toBe(3);
    expect(answererIndex(0)).toBe(0);
    expect(answererIndex(1)).toBe(1);
    // couple fastest, then question, then the phase is done
    expect(nextFlashSlot(2, { q: 0, couple: 0 })).toEqual({ q: 0, couple: 1 });
    expect(nextFlashSlot(2, { q: 0, couple: 1 })).toEqual({ q: 1, couple: 0 });
    expect(nextFlashSlot(2, { q: 1, couple: 1 })).toBeNull();
    expect(nextFlashSlot(1, { q: 0, couple: 0 })).toEqual({ q: 1, couple: 0 });
    expect(nextFlashSlot(1, { q: 1, couple: 0 })).toBeNull();
    expect(answerKey('t1', 7)).toBe('t1|7');
    expect(planOf('dilemma', 10)[0]).toMatchObject({ from: 0 });
    expect(planOf('ultime', 19)[2]).toMatchObject({ kind: 'dilemma', from: 4 });
    expect(planOf('ultime', 19)[3]).toMatchObject({ kind: 'rapid', from: 9 });
  });

  it('opens on the answerers group gate, round 0, everyone at zero', () => {
    const g = newGame(flashConfig('open'));
    expect(g.step).toEqual({ kind: 'gate', side: 'answerers', secrets: {} });
    expect(flashRound(g.ctx)).toBe(0);
    expect(g.ctx.scores).toEqual({ t1: 0, t2: 0 });
  });

  it('collect phase: gate → light handoff → input, interleaved by question (Q1 all couples, then Q2)', () => {
    const order: string[] = [];
    let g = play(newGame(flashConfig('open')), NEXT);
    while (g.step.kind === 'handoff' || g.step.kind === 'secret') {
      order.push(`${g.step.kind}:${g.step.q}${g.step.couple}`);
      g = g.step.kind === 'handoff' ? play(g, NEXT) : play(g, answer('a'));
    }
    expect(order).toEqual([
      'handoff:00', 'secret:00',
      'handoff:01', 'secret:01',
      'handoff:10', 'secret:10',
      'handoff:11', 'secret:11',
    ]);
    expect(g.step).toMatchObject({ kind: 'gate', side: 'guessers' }); // the phone crosses the sofa
  });

  it('the two questions are SHARED: every couple sees the same ids in a round', () => {
    let g = play(newGame(flashConfig('open')), NEXT, NEXT); // → secret (0,0)
    const q00 = cardOf(g)?.id;
    g = play(g, answer('a'), NEXT); // → (0,1)
    expect(cardOf(g)?.id).toBe(q00);
    g = play(g, answer('a'), NEXT); // → (1,0)
    const q10 = cardOf(g)?.id;
    expect(q10).not.toBe(q00);
    g = play(g, answer('a'), NEXT); // → (1,1)
    expect(cardOf(g)?.id).toBe(q10);
  });

  it('answers are keyed per (couple, question) and all coexist for the round', () => {
    const g = collectRound(newGame(flashConfig('open')), (q, c) => `c${c}q${q}`);
    expect(secretsOf(g)).toEqual({
      't1|1': 'c0q0',
      't2|1': 'c1q0',
      't1|2': 'c0q1',
      't2|2': 'c1q1',
    });
  });

  it('guess phase: gate → guess/judge interleaved by question, then scoreboard; scores per couple', () => {
    const collected = collectRound(newGame(flashConfig('open')), always('a'));
    // t1: exact, close → 3 · t2: miss, exact → 2
    const g = guessRound(collected, (q, c) => (c === 0 ? (q === 0 ? 'exact' : 'close') : q === 0 ? 'miss' : 'exact'));
    expect(g.step).toEqual({ kind: 'scoreboard' });
    expect(g.ctx.seg).toBe(0);
    expect(g.ctx.scores).toEqual({ t1: 3, t2: 2 });
  });

  it("judge sees the RIGHT couple's locked answer for the slot", () => {
    let g = play(collectRound(newGame(flashConfig('open')), (q, c) => `c${c}q${q}`), NEXT);
    expect(secretOf(g)).toBe('c0q0'); // guess (0,0) → couple 0's Q1
    g = play(g, NEXT, verdict('miss'));
    expect(secretOf(g)).toBe('c1q0'); // (0,1) → couple 1's Q1
    g = play(g, NEXT, verdict('miss'));
    expect(secretOf(g)).toBe('c0q1'); // (1,0) → couple 0's Q2
  });

  it("auto-guess (closed question) compares against the slot couple's own answer", () => {
    // t1 answered yes to both, t2 answered no to both
    const collected = collectRound(newGame(flashConfig('yes_no')), (_q, c) => (c === 0 ? 'yes' : 'no'));
    let g = play(collected, NEXT);
    g = play(g, guess('yes')); // (0,0) t1 truth yes → +2
    g = play(g, guess('yes')); // (0,1) t2 truth no → 0
    g = play(g, guess('no')); // (1,0) t1 truth yes → 0
    g = play(g, guess('no')); // (1,1) t2 truth no → +2
    expect(g.step.kind).toBe('scoreboard');
    expect(g.ctx.scores).toEqual({ t1: 2, t2: 2 });
  });

  it('who_of_two answers and guesses are language-free player tokens', () => {
    const collected = collectRound(newGame(flashConfig('who_of_two', soloRoster)), (q) => (q === 0 ? 'p1' : 'p0'));
    expect(secretsOf(collected)).toEqual({ 't1|1': 'p1', 't1|2': 'p0' });
    const g = play(collected, NEXT, guess('p1'), guess('p1'));
    expect(g.ctx.scores).toEqual({ t1: 2 });
  });

  it('plays a full 2-couple game: round 0 → scoreboard → round 1 (roles swapped) → final', () => {
    let g = newGame(flashConfig('open'));
    g = playRound(g, always('a'), (_q, c) => (c === 0 ? 'exact' : 'miss')); // t1 +4
    expect(g.step.kind).toBe('scoreboard');
    g = play(g, NEXT);
    expect(g.step).toMatchObject({ kind: 'gate', side: 'answerers' });
    expect(flashRound(g.ctx)).toBe(1);
    g = playRound(g, always('a'), (_q, c) => (c === 0 ? 'close' : 'exact')); // t1 +2, t2 +4
    expect(g.step.kind).toBe('final');
    expect(g.ctx.scores).toEqual({ t1: 6, t2: 4 });
  });

  it("a new round starts with the previous round's answers cleared", () => {
    let g = play(playRound(newGame(flashConfig('open')), always('a'), always('exact')), NEXT); // → round 1 gate
    g = play(g, NEXT, NEXT); // handoff → secret (0,0)
    expect(g.step.kind).toBe('secret');
    expect(secretsOf(g)).toEqual({});
  });

  it('round 1 draws the second shared pair', () => {
    let g = play(playRound(newGame(flashConfig('open')), always('a'), always('exact')), NEXT);
    g = play(g, NEXT, NEXT); // secret (0,0) round 1
    expect(cardOf(g)?.id).toBe(3); // ids 1,2 were round 0
  });

  it('solo (1 couple) degenerates: no handoff, gates are the strict pass screens, Q1 Q2 → guess Q1 Q2', () => {
    let g = newGame(flashConfig('open', soloRoster));
    expect(g.step).toMatchObject({ kind: 'gate', side: 'answerers' });
    g = play(g, NEXT);
    expect(g.step.kind).toBe('secret'); // straight in — nobody to hand the phone to
    expect(slotOf(g)).toEqual([0, 0]);
    g = play(g, answer('x'));
    expect(g.step.kind).toBe('secret');
    expect(slotOf(g)).toEqual([1, 0]);
    g = play(g, answer('y'));
    expect(g.step).toMatchObject({ kind: 'gate', side: 'guessers' });
    g = guessRound(g, always('exact')); // +4
    expect(g.step.kind).toBe('scoreboard');
    g = play(g, NEXT);
    g = collectRound(g, always('z'));
    g = guessRound(g, always('close')); // +2
    expect(g.step.kind).toBe('final');
    expect(g.ctx.scores).toEqual({ t1: 6 });
  });

  describe("a judged slot's secret leaves the state (and the save)", () => {
    // 2 couples, both answered both shared questions: t1|1 t2|1 t1|2 t2|2.
    const locked = () => play(collectRound(newGame(flashConfig('this_or_that')), (q, c) => `c${c}q${q}`), NEXT);

    it('judge drops only the judged (couple, question) key', () => {
      const judge = play(locked(), NEXT);
      expect(judge.step.kind).toBe('judge');
      const before = structuredClone(judge);

      const next = play(judge, verdict('exact')); // slot (0,0) = t1|1
      expect(next.step.kind).toBe('guess');
      expect(secretsOf(next)).toEqual({ 't2|1': 'c1q0', 't1|2': 'c0q1', 't2|2': 'c1q1' });
      expect(secretsOf(ZGameSchema.parse(next) as TGame)).not.toHaveProperty('t1|1');
      expect(judge).toEqual(before); // incoming game not mutated
      expect(secretsOf(judge)).toHaveProperty('t1|1', 'c0q0');

      // next slot (0,1) = t2|1: the other couple's answer to the SAME question
      const after = play(next, NEXT, verdict('miss'));
      expect(after.step.kind).toBe('guess');
      expect(secretsOf(after)).toEqual({ 't1|2': 'c0q1', 't2|2': 'c1q1' });
    });

    it('a closed guess drops only the judged (couple, question) key', () => {
      // yes_no: t1 answered yes/no to Q1/Q2, t2 no/yes
      const yn = (q: number, c: number) => ((q + c) % 2 === 0 ? 'yes' : 'no');
      const g = play(collectRound(newGame(flashConfig('yes_no')), yn), NEXT);
      const before = structuredClone(g);

      const next = play(g, guess('yes')); // slot (0,0) = t1|1
      expect(next.step.kind).toBe('guess');
      expect(next.ctx.scores).toEqual({ t1: 2, t2: 0 }); // judged against the truth before dropping it
      expect(secretsOf(next)).toEqual({ 't2|1': 'no', 't1|2': 'no', 't2|2': 'yes' });
      expect(g).toEqual(before); // incoming game not mutated
      expect(secretsOf(g)).toHaveProperty('t1|1', 'yes');
    });
  });

  it('mid-phase resume: every Flash step is a valid save with locked answers intact', () => {
    const roundTrips = (g: TGame) => expect(ZGameSchema.parse(g)).toEqual(g);
    const gate = newGame(flashConfig('open'));
    roundTrips(gate);

    let g = play(gate, NEXT); // handoff (0,0)
    roundTrips(g);
    g = play(g, NEXT, answer('a')); // handoff (0,1) with 1 locked
    roundTrips(g);
    g = play(g, NEXT, answer('b')); // handoff (1,0), 2 locked
    g = play(g, NEXT); // secret (1,0)
    roundTrips(g);
    expect(Object.keys(secretsOf(g) ?? {})).toHaveLength(2);

    g = play(g, answer('c'), NEXT, answer('d'));
    expect(g.step).toMatchObject({ kind: 'gate', side: 'guessers' });
    roundTrips(g);

    const guessing = play(g, NEXT);
    roundTrips(guessing);
    const judge = play(guessing, NEXT);
    roundTrips(judge);
    expect(Object.keys(secretsOf(judge) ?? {})).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Ultime (composition)
// ---------------------------------------------------------------------------

function ultimeConfig(): TNewGameConfig {
  const size = 4 + 5 + 5 * 2; // shared flash 4 + dilemma 5 + rapid 5N, N=2 → 19
  const ultimeDeck: TDeckCard[] = Array.from({ length: size }, (_, i) => ({ id: i + 1, type: 'open' }));
  return { roster: flashRoster, mode: 'ultime', difficulty: 'mix', themes: [], deck: ultimeDeck };
}

function ultimeRapidCouple(start: TGame, synchros: boolean[]): TGame {
  let g = play(start, NEXT); // rapidTurn → rapidAsk
  for (const syn of synchros) g = play(g, NEXT, verdict(syn ? 'exact' : 'miss'));
  return g;
}

describe('Ultime machine (composition)', () => {
  it('opens on the shared-Flash answerers gate', () => {
    const g = newGame(ultimeConfig());
    expect(g.step).toMatchObject({ kind: 'gate', side: 'answerers' });
    expect(flashRound(g.ctx)).toBe(0);
  });

  it('plays sofa-side flash rounds → dilemma → rapid-fire → final with scoreboards between', () => {
    let g = newGame(ultimeConfig());

    // Flash round 0 (2 shared questions): t1 exact ×2 = 4, t2 miss = 0
    g = playRound(g, always('a'), (_q, c) => (c === 0 ? 'exact' : 'miss'));
    expect(g.step.kind).toBe('scoreboard');
    expect(g.ctx.seg).toBe(0);

    g = play(g, NEXT); // → flash round 1
    expect(g.step).toMatchObject({ kind: 'gate', side: 'answerers' });
    expect(flashRound(g.ctx)).toBe(1);
    g = playRound(g, always('a'), always('exact')); // +4 each
    expect(g.step.kind).toBe('scoreboard');

    g = play(g, NEXT); // → dilemma segment, right after the shared block
    expect(g.step.kind).toBe('ask');
    expect(cardOf(g)?.id).toBe(5);
    for (let i = 0; i < 5; i++) g = playQuestion(g, ['exact', 'miss']); // t1 +5
    expect(g.step).toEqual({ kind: 'scoreboard' }); // no halfway board inside Ultime

    g = play(g, NEXT); // → rapid-fire
    expect(g.step.kind).toBe('rapidIntro');
    g = play(g, NEXT);
    expect(g.step.kind).toBe('rapidTurn');
    const rq = play(g, NEXT);
    expect(cardOf(rq)?.id).toBe(10); // after flash 4 + dilemma 5
    g = ultimeRapidCouple(g, [true, true, true, true, true]); // t1 +10
    expect(g.step.kind).toBe('rapidTurn');
    g = ultimeRapidCouple(g, [true, false, true, false, true]); // t2 +6 → final
    expect(g.step.kind).toBe('final');

    expect(g.ctx.scores).toEqual({ t1: 4 + 4 + 5 + 10, t2: 0 + 4 + 0 + 6 });
  });

  it('rapid-fire questions alternate between the two partners', () => {
    expect([0, 1, 2, 3, 4].map(rapidSubjectIndex)).toEqual([0, 1, 0, 1, 0]);
  });

  it('rapid-fire steps are valid saves', () => {
    const rapidTurn = at(newGame(ultimeConfig()), { kind: 'rapidTurn', couple: 1 }, 3);
    expect(ZGameSchema.parse(rapidTurn)).toEqual(rapidTurn);
    const rq = play(rapidTurn, NEXT);
    expect(rq.step).toEqual({ kind: 'rapidAsk', q: 0, couple: 1 });
    expect(cardOf(rq)?.id).toBe(15); // couple 1's first rapid card
    expect(ZGameSchema.parse(rq)).toEqual(rq);
  });
});

// ---------------------------------------------------------------------------
// History — every scoring decision appends exactly one entry
// ---------------------------------------------------------------------------

describe('history — one entry per scoring decision, scores unchanged', () => {
  it('newGame starts empty (so a rematch / new game does too)', () => {
    expect(newGame(config).ctx.history).toEqual([]);
    expect(newGame(flashConfig('open')).ctx.history).toEqual([]);
    expect(newGame(ultimeConfig()).ctx.history).toEqual([]);
  });

  it('dilemma verdict: a match records 1/1, a miss records 0/1 (zero outcomes included)', () => {
    const g = playQuestion(newGame(config), ['exact', 'miss']);
    expect(g.ctx.history).toEqual([
      { teamId: 't1', stage: 'dilemma', round: 0, points: 1, max: 1 },
      { teamId: 't2', stage: 'dilemma', round: 0, points: 0, max: 1 },
    ]);
    expect(g.ctx.scores).toEqual({ t1: 1, t2: 0 });
  });

  it('flash judge: exact 2/2, close 1/2, miss 0/2, tagged with the flash round', () => {
    const collected = collectRound(newGame(flashConfig('open')), always('a'));
    const verdicts: TVerdict[] = ['exact', 'close', 'miss', 'exact'];
    let i = 0;
    const g = guessRound(collected, () => verdicts[i++]!);
    // slot order: (q0,c0) (q0,c1) (q1,c0) (q1,c1)
    expect(g.ctx.history).toEqual([
      { teamId: 't1', stage: 'flash', round: 0, points: 2, max: 2 },
      { teamId: 't2', stage: 'flash', round: 0, points: 1, max: 2 },
      { teamId: 't1', stage: 'flash', round: 0, points: 0, max: 2 },
      { teamId: 't2', stage: 'flash', round: 0, points: 2, max: 2 },
    ]);
    expect(g.ctx.scores).toEqual({ t1: 2, t2: 3 });
  });

  it('flash closed guess records too, and round 1 is tagged 1', () => {
    // round 0 open (judged), round 1 yes/no (auto-judged)
    let g = newGame(flashConfig(['open', 'open', 'yes_no', 'yes_no'], soloRoster));
    g = play(playRound(g, always('Left'), always('exact')), NEXT); // not auto, round 0 done
    g = collectRound(g, always('yes'));
    g = play(g, NEXT);
    g = play(g, guess('yes')); // exact
    g = play(g, guess('no')); // miss → final
    expect(g.step.kind).toBe('final');
    const round1 = g.ctx.history.filter((h) => h.round === 1);
    expect(round1).toEqual([
      { teamId: 't1', stage: 'flash', round: 1, points: 2, max: 2 },
      { teamId: 't1', stage: 'flash', round: 1, points: 0, max: 2 },
    ]);
    expect(g.ctx.history).toHaveLength(4);
    expect(g.ctx.scores).toEqual({ t1: 4 + 2 });
  });

  it('rapid judge: synchro 2/2, no synchro 0/2', () => {
    const start = at(newGame({ ...ultimeConfig(), roster: soloRoster }), { kind: 'rapidTurn', couple: 0 }, 3);
    const g = ultimeRapidCouple(start, [true, false, true, false, false]);
    expect(g.step.kind).toBe('final');
    expect(g.ctx.history).toEqual([
      { teamId: 't1', stage: 'rapid', round: 0, points: 2, max: 2 },
      { teamId: 't1', stage: 'rapid', round: 0, points: 0, max: 2 },
      { teamId: 't1', stage: 'rapid', round: 0, points: 2, max: 2 },
      { teamId: 't1', stage: 'rapid', round: 0, points: 0, max: 2 },
      { teamId: 't1', stage: 'rapid', round: 0, points: 0, max: 2 },
    ]);
    expect(g.ctx.scores).toEqual({ t1: 4 });
  });

  it('a full Ultime appends one entry per scored question, and the totals always equal the scores', () => {
    let g = newGame(ultimeConfig());
    for (let step = 0; g.step.kind !== 'final'; step++) {
      if (step > 1000) throw new Error('stuck');
      g = play(g, SCRIPT[g.step.kind as TNonFinal]);
    }
    // 2 couples: flash 2 rounds × 2 q × 2 couples = 8, dilemma 5 × 2 = 10, rapid 5 × 2 = 10
    const by = (stage: string) => g.ctx.history.filter((h) => h.stage === stage).length;
    expect([by('flash'), by('dilemma'), by('rapid')]).toEqual([8, 10, 10]);
    for (const team of g.ctx.roster) {
      const total = g.ctx.history.filter((h) => h.teamId === team.teamId).reduce((n, h) => n + h.points, 0);
      expect(total).toBe(g.ctx.scores[team.teamId]);
    }
    expect(g.ctx.history.every((h) => h.points <= h.max)).toBe(true);
  });

  it('non-scoring transitions leave history untouched', () => {
    const q = newGame(config);
    expect(play(q, NEXT).ctx.history).toBe(q.ctx.history);
  });

  it('round-trips through the schema (mid-game and at the final)', () => {
    let g = newGame(config);
    for (let i = 0; i < 3; i++) g = playQuestion(g, ['exact', 'miss']);
    expect(g.ctx.history).toHaveLength(6);
    expect(ZGameSchema.parse(g)).toEqual(g);
    for (let i = 0; i < 7; i++) {
      g = playQuestion(g, ['exact', 'miss']);
      if (g.step.kind === 'scoreboard') g = play(g, NEXT);
    }
    expect(g.step.kind).toBe('final');
    expect(ZGameSchema.parse(g)).toEqual(g);
  });

  it('a stored game without history (pre-redesign shape) is rejected, never half-resumed', () => {
    const { history: _drop, ...ctx } = newGame(config).ctx;
    expect(ZGameSchema.safeParse({ ctx, step: { kind: 'ask', q: 0 } }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Persisted-schema round-trip: every real state must be saveable
// ---------------------------------------------------------------------------

type TNonFinal = Exclude<TStepKind, 'final'>;

/** The one deterministic event each non-final kind advances on (open-question decks). */
const SCRIPT: Record<TNonFinal, TGameEventBody> = {
  ask: NEXT,
  resolve: verdict('exact'),
  gate: NEXT,
  handoff: NEXT,
  // Longest answer the secret input allows (maxLength 40).
  secret: answer('x'.repeat(SECRET_MAX)),
  guess: NEXT,
  judge: verdict('exact'),
  rapidIntro: NEXT,
  rapidTurn: NEXT,
  rapidAsk: NEXT,
  rapidJudge: verdict('exact'),
  scoreboard: NEXT,
};

/** A real roster: teamIds t1..tN (as Setup assigns them), 16-char names (the input cap). */
function realRoster(n: number): TRoster {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i + 1}`,
    avatarId: AVATAR_IDS[i]!,
    players: [`P${i + 1}a`.padEnd(16, '_'), `P${i + 1}b`.padEnd(16, '_')] as [string, string],
  }));
}

/** Catalog-like ids (the real catalog tops out at 1135). */
function realDeck(mode: TMode, size: number): TDeckCard[] {
  return Array.from({ length: size }, (_, i) => ({ id: 1000 + i, type: mode === 'dilemma' ? 'who_of_two' : 'open' }));
}

const CARD_KINDS: ReadonlySet<TStepKind> = new Set(['handoff', 'secret', 'guess', 'judge', 'ask', 'resolve', 'rapidAsk', 'rapidJudge']);

/** Drive a game to `final`, asserting the persisted schema + consistency after every transition. */
function playToFinalCheckingSaves(cfg: TNewGameConfig, kinds = new Set<TStepKind>()) {
  let g = newGame(cfg);
  let maxQ = 0;
  let pastDeck = false;
  const check = (game: TGame) => {
    const result = ZGameSchema.safeParse(game);
    expect(result.success, `game rejected in "${game.step.kind}": ${result.error?.message ?? ''}`).toBe(true);
    expect(isGameConsistent(game), `inconsistent at "${game.step.kind}"`).toBe(true);
    if ('q' in game.step) maxQ = Math.max(maxQ, game.step.q);
    pastDeck ||= CARD_KINDS.has(game.step.kind) && cardOf(game) === undefined;
    kinds.add(game.step.kind);
  };
  check(g);
  for (let step = 0; g.step.kind !== 'final'; step++) {
    if (step > 1000) throw new Error(`no final after 1000 steps (stuck in "${g.step.kind}")`);
    const next = play(g, SCRIPT[g.step.kind]);
    if (next === g) throw new Error(`no progress from "${g.step.kind}"`);
    g = next;
    check(g);
  }
  return { maxQ, pastDeck };
}

describe('every real state fits the persisted game schema', () => {
  const modes: TMode[] = ['flash', 'dilemma', 'ultime'];
  const cases = modes.flatMap((mode) => [1, 2, 3, 4].map((couples) => [mode, couples] as const));

  it.each(cases)('%s with %i couple(s), nominal deck', (mode, couples) => {
    const d = realDeck(mode, deckSizeFor(mode, couples));
    playToFinalCheckingSaves({ roster: realRoster(couples), mode, difficulty: 'mix', themes: [], deck: d });
  });

  const shortCases = (['flash', 'ultime'] as const).flatMap((mode) =>
    [1, 4].flatMap((couples) => [1, 2].map((size) => [mode, couples, size] as const)),
  );

  it.each(shortCases)('%s with %i couple(s), short deck of %i', (mode, couples, size) => {
    const d = realDeck(mode, size);
    const { maxQ, pastDeck } = playToFinalCheckingSaves({ roster: realRoster(couples), mode, difficulty: 'mix', themes: [], deck: d });
    // The cursor legitimately runs past the end of a short deck…
    expect(pastDeck).toBe(true);
    // …and in Ultime the stored q itself exceeds deck.length (the Dilemma segment is always 5),
    // which the schema must not reject.
    if (mode === 'ultime') expect(maxQ).toBeGreaterThan(d.length);
  });

  it('the scripted games reach all 12 non-final kinds and the final', () => {
    const kinds = new Set<TStepKind>();
    for (const mode of modes) {
      playToFinalCheckingSaves({ roster: realRoster(2), mode, difficulty: 'mix', themes: [], deck: realDeck(mode, deckSizeFor(mode, 2)) }, kinds);
    }
    expect([...kinds].sort()).toEqual([...Object.keys(SCRIPT), 'final'].sort());
  });
});

// ---------------------------------------------------------------------------
// The rule book: legality, seq, validation, short decks
// ---------------------------------------------------------------------------

const EVENTS: TGameEventBody[] = [
  NEXT,
  answer('pasta'),
  answer('yes'),
  guess('yes'),
  guess('p0'),
  verdict('exact'),
  verdict('close'),
  verdict('miss'),
];

/** One game per step kind (2 couples), with the card type that kind is tested on. */
function sampleGames(): { label: string; game: TGame; legal: (e: TGameEventBody) => boolean }[] {
  const ult = newGame({ ...ultimeConfig(), deck: flashDeck(['open', 'yes_no', 'open', 'open']).concat(ultimeConfig().deck.slice(4)) });
  const secrets = { [answerKey('t1', 2)]: 'yes', [answerKey('t1', 1)]: 'pasta' };
  const isNext = (e: TGameEventBody) => e.type === 'next';
  const isVerdictIn = (...vs: TVerdict[]) => (e: TGameEventBody) => e.type === 'verdict' && vs.includes(e.v);
  return [
    { label: 'ask', game: at(ult, { kind: 'ask', q: 0 }, 2), legal: isNext },
    { label: 'resolve', game: at(ult, { kind: 'resolve', q: 0, couple: 0, results: {} }, 2), legal: isVerdictIn('exact', 'miss') },
    { label: 'gate answerers', game: ult, legal: isNext },
    { label: 'gate guessers', game: at(ult, { kind: 'gate', side: 'guessers', secrets }), legal: isNext },
    { label: 'handoff', game: at(ult, { kind: 'handoff', q: 0, couple: 1, secrets: {} }), legal: isNext },
    { label: 'secret (open)', game: at(ult, { kind: 'secret', q: 0, couple: 0, secrets: {} }), legal: (e) => e.type === 'answer' },
    { label: 'secret (yes_no)', game: at(ult, { kind: 'secret', q: 1, couple: 0, secrets: {} }), legal: (e) => e.type === 'answer' && e.value === 'yes' },
    { label: 'guess (open)', game: at(ult, { kind: 'guess', q: 0, couple: 0, secrets }), legal: isNext },
    { label: 'guess (yes_no)', game: at(ult, { kind: 'guess', q: 1, couple: 0, secrets }), legal: (e) => e.type === 'guess' && e.value === 'yes' },
    { label: 'judge', game: at(ult, { kind: 'judge', q: 0, couple: 0, secrets }), legal: isVerdictIn('exact', 'close', 'miss') },
    { label: 'rapidIntro', game: at(ult, { kind: 'rapidIntro' }, 3), legal: isNext },
    { label: 'rapidTurn', game: at(ult, { kind: 'rapidTurn', couple: 1 }, 3), legal: isNext },
    { label: 'rapidAsk', game: at(ult, { kind: 'rapidAsk', q: 2, couple: 1 }, 3), legal: isNext },
    { label: 'rapidJudge', game: at(ult, { kind: 'rapidJudge', q: 2, couple: 1 }, 3), legal: isVerdictIn('exact', 'miss') },
    { label: 'scoreboard', game: at(ult, { kind: 'scoreboard' }, 1), legal: isNext },
    { label: 'scoreboard (halfway)', game: at(newGame(config), { kind: 'scoreboard', resumeQ: 5 }), legal: isNext },
    { label: 'final', game: at(ult, { kind: 'final' }, 3), legal: () => false },
  ];
}

describe('legality — the reducer is the rule book', () => {
  const samples = sampleGames();

  it('every sample is a consistent, valid game', () => {
    for (const { label, game } of samples) {
      expect(ZGameSchema.safeParse(game).success, label).toBe(true);
      expect(isGameConsistent(game), label).toBe(true);
    }
    expect(new Set(samples.map((s) => s.game.step.kind)).size).toBe(13);
  });

  it.each(samples.map((s) => [s.label, s] as const))('%s: an illegal event returns the same object; a legal one moves once', (label, { game, legal }) => {
    for (const event of EVENTS) {
      const next = reduce(game, { ...event, seq: game.ctx.seq });
      if (legal(event)) {
        expect(next, `${label} × ${JSON.stringify(event)}`).not.toBe(game);
        expect(next.ctx.seq).toBe(game.ctx.seq + 1);
        expect(ZGameSchema.safeParse(next).success).toBe(true);
      } else {
        expect(next, `${label} × ${JSON.stringify(event)}`).toBe(game);
      }
    }
  });

  it.each(samples.filter((s) => s.label !== 'final').map((s) => [s.label, s] as const))(
    '%s: a stale seq is ignored, and a double dispatch with the same seq moves once',
    (label, { game, legal }) => {
      const event = EVENTS.find(legal)!;
      expect(reduce(game, { ...event, seq: game.ctx.seq + 1 }), label).toBe(game);
      expect(reduce(game, { ...event, seq: game.ctx.seq - 1 }), label).toBe(game);
      const seq = game.ctx.seq;
      const once = reduce(game, { ...event, seq });
      expect(once).not.toBe(game);
      expect(reduce(once, { ...event, seq }), label).toBe(once);
      // the same event with a still-old seq after two more taps: still ignored
      expect(reduce(reduce(once, { ...event, seq }), { ...event, seq }), label).toBe(once);
    },
  );

  it('a double NEXT on the guessers gate never skips to the reveal (judge)', () => {
    const gate = sampleGames().find((s) => s.label === 'gate guessers')!.game;
    const seq = gate.ctx.seq;
    const once = reduce(gate, { type: 'next', seq });
    expect(once.step.kind).toBe('guess');
    expect(reduce(once, { type: 'next', seq }).step.kind).toBe('guess');
  });

  it('guess on an open (or this_or_that) question is ignored; next on a closed one too', () => {
    for (const type of ['open', 'this_or_that'] as const) {
      const g = play(collectRound(newGame(flashConfig(type)), always('a')), NEXT);
      expect(play(g, guess('a'))).toBe(g);
      expect(play(g, guess('yes'))).toBe(g);
    }
    for (const type of ['yes_no', 'who_of_two'] as const) {
      const g = play(collectRound(newGame(flashConfig(type)), always(type === 'yes_no' ? 'yes' : 'p0')), NEXT);
      expect(play(g, NEXT)).toBe(g);
      expect(play(g, guess(type === 'yes_no' ? 'p0' : 'yes'))).toBe(g); // the other type's token
    }
  });

  it('close is only legal in judge', () => {
    const r = play(newGame(config), NEXT);
    expect(play(r, verdict('close'))).toBe(r);
    const rj = at(newGame(ultimeConfig()), { kind: 'rapidJudge', q: 0, couple: 0 }, 3);
    expect(play(rj, verdict('close'))).toBe(rj);
    const judge = play(collectRound(newGame(flashConfig('open')), always('a')), NEXT, NEXT);
    expect(judge.step.kind).toBe('judge');
    expect(play(judge, verdict('close')).ctx.scores.t1).toBe(1);
  });
});

describe('secret answers are validated and normalised', () => {
  const secretAt = (type: TQuestionType) => play(newGame(flashConfig(type, soloRoster)), NEXT);
  const locked = (g: TGame) => secretsOf(g)?.['t1|1'];

  it('open: empty, blank or invisible-only answers are refused', () => {
    const g = secretAt('open');
    expect(play(g, answer(''))).toBe(g);
    expect(play(g, answer('   '))).toBe(g);
    expect(play(g, answer('\u200b\u200d\u2060\ufeff'))).toBe(g);
    expect(play(g, answer(' \u202e '))).toBe(g);
  });

  it('open: the stored answer is trimmed, NFC, without invisible characters', () => {
    const g = secretAt('open');
    expect(locked(play(g, answer('  pa\u200bsta  ')))).toBe('pasta');
    expect(locked(play(g, answer('cafe\u0301')))).toBe('caf\u00e9');
  });

  it('open: an over-long answer is cut to the input cap', () => {
    const g = secretAt('this_or_that');
    expect(locked(play(g, answer('x'.repeat(SECRET_MAX + 10))))).toBe('x'.repeat(SECRET_MAX));
  });

  it('closed: only a canonical token is accepted (never a localized label)', () => {
    const yn = secretAt('yes_no');
    for (const bad of ['Yes', 'oui', 'p0', '', 'maybe']) expect(play(yn, answer(bad)), bad).toBe(yn);
    expect(locked(play(yn, answer('no')))).toBe('no');
    const two = secretAt('who_of_two');
    for (const bad of ['p2', 'A1', 'yes', '']) expect(play(two, answer(bad)), bad).toBe(two);
    expect(locked(play(two, answer('p1')))).toBe('p1');
  });
});

describe('short deck — a slot with no card never sticks', () => {
  // 1 card for a 4-card Flash block: only round 0, Q1 has a card.
  const shortGame = () => newGame({ roster: soloRoster, mode: 'flash', difficulty: 'mix', themes: [], deck: [{ id: 9, type: 'yes_no' }] });

  it('any answer is accepted and stored nowhere', () => {
    let g = play(shortGame(), NEXT, answer('yes')); // Q1 (card) locked
    expect(g.step.kind).toBe('secret');
    expect(cardOf(g)).toBeUndefined();
    const before = secretsOf(g);
    g = play(g, answer(''));
    expect(g.step).toMatchObject({ kind: 'gate', side: 'guessers' });
    expect(secretsOf(g)).toEqual(before);
    expect(secretsOf(g)).toEqual({ 't1|9': 'yes' });
  });

  it('guess scores 0 (recorded), next reveals for the table to judge', () => {
    const g = play(shortGame(), NEXT, answer('yes'), answer('whatever'), NEXT, guess('yes')); // Q1: +2
    expect(g.step).toMatchObject({ kind: 'guess', q: 1 });
    const guessed = play(g, guess('anything'));
    expect(guessed.step.kind).toBe('scoreboard');
    expect(guessed.ctx.history.at(-1)).toEqual({ teamId: 't1', stage: 'flash', round: 0, points: 0, max: 2 });
    const revealed = play(g, NEXT);
    expect(revealed.step.kind).toBe('judge');
    expect(play(revealed, verdict('close')).ctx.scores).toEqual({ t1: 3 });
  });

  it('round 1 (no card at all) plays through to the final', () => {
    let g = play(shortGame(), NEXT, answer('yes'), answer('x'), NEXT, guess('no'), NEXT, verdict('miss'), NEXT);
    expect(g.step).toMatchObject({ kind: 'gate', side: 'answerers' });
    g = play(g, NEXT, answer('a'), answer('b'), NEXT, guess('c'), NEXT, verdict('exact'));
    expect(g.step.kind).toBe('final');
    expect(g.ctx.scores).toEqual({ t1: 2 });
  });
});
