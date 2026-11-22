import { describe, expect, it } from 'vitest';
import { CLOSED_TOKENS, FLASH_SET, POINTS, answerKey, isClosedType, isGameConsistent, newGame, type TDeckCard, type TGame } from '@/shared/game/domain/game';
import type { TRoster } from '@/shared/game/domain/types';
import type { TQuestion, TQuestionType } from '@/shared/questions/domain/types';
import { cardOf, questionText, reduce, secretOf, type TGameEventBody } from './machine';

/** The `choice` question type in the rules: tokens c0..c2, answer locks, guess scores by match, no judge. */

const solo: TRoster = [{ teamId: 't1', avatarId: 'otters', players: ['A1', 'A2'] }];
const duo: TRoster = [...solo, { teamId: 't2', avatarId: 'lions', players: ['B1', 'B2'] }];

const NEXT: TGameEventBody = { type: 'next' };
const answer = (value: string): TGameEventBody => ({ type: 'answer', value });
const guess = (value: string): TGameEventBody => ({ type: 'guess', value });
const play = (game: TGame, ...events: TGameEventBody[]): TGame => events.reduce((g, e) => reduce(g, { ...e, seq: g.ctx.seq }), game);

/** A Flash game whose four cards (ids 1..4) have the given types. */
const flash = (types: TQuestionType[], roster: TRoster = solo): TGame =>
  newGame({ roster, mode: 'flash', difficulty: 'mix', themes: [], deck: types.map((type, i): TDeckCard => ({ id: i + 1, type })) });

/** Solo, slot 0 is a choice card: at its Secret screen. */
const atSecret = () => play(flash(['choice', 'open', 'open', 'open']), NEXT);
/** Solo, slot 0 is a choice card locked to `picked`: at its Guess screen (the second card, open, answered `x`). */
const atGuess = (picked: string) => play(atSecret(), answer(picked), answer('x'), NEXT);

describe('choice tokens', () => {
  it('CLOSED_TOKENS.choice is c0, c1, c2: one static list for every question', () => {
    expect(CLOSED_TOKENS.choice).toEqual(['c0', 'c1', 'c2']);
  });

  it('a choice is a closed type; the others did not change', () => {
    expect(isClosedType('choice')).toBe(true);
    expect(CLOSED_TOKENS.yes_no).toEqual(['yes', 'no']);
    expect(CLOSED_TOKENS.who_of_two).toEqual(['p0', 'p1']);
    expect(isClosedType('open')).toBe(false);
    expect(isClosedType('this_or_that')).toBe(false);
  });
});

describe('questionText: a choice reads the same for both screens', () => {
  const q: TQuestion = { id: 9, theme: 'homeDaily', difficulty: 'easy', type: 'choice', question: 'La porte claque. Ton réflexe ?', options: ['A', 'B', 'C'] };

  it('returns question.question for you and for name, whoever answered', () => {
    expect(questionText(q, 'you')).toBe('La porte claque. Ton réflexe ?');
    expect(questionText(q, 'name', 'Camille')).toBe('La porte claque. Ton réflexe ?');
    expect(questionText(q, 'name')).toBe('La porte claque. Ton réflexe ?');
  });

  it('does not interpolate: a literal {name} in the text is left alone', () => {
    const odd: TQuestion = { ...q, question: 'Que fait {name} ?' } as TQuestion;
    expect(questionText(odd, 'name', 'Camille')).toBe('Que fait {name} ?');
  });

  it('the other types are unchanged', () => {
    const open: TQuestion = { id: 1, theme: 'travel', difficulty: 'easy', type: 'open', you: 'ton truc ?', name: 'le truc de {name} ?' };
    expect(questionText(open, 'you')).toBe('ton truc ?');
    expect(questionText(open, 'name', 'Noa')).toBe('le truc de Noa ?');
    expect(questionText(undefined, 'you')).toBe('');
  });
});

describe('choice: the answer locks only c0..c2', () => {
  it('the card on the Secret screen is the choice card', () => {
    expect(cardOf(atSecret())).toEqual({ id: 1, type: 'choice' });
  });

  it.each(['c0', 'c1', 'c2'])('%s locks and moves on to the next slot', (token) => {
    const g = atSecret();
    const next = play(g, answer(token));
    expect(next).not.toBe(g);
    expect(next.step).toMatchObject({ kind: 'secret', q: 1 });
    expect('secrets' in next.step && next.step.secrets[answerKey('t1', 1)]).toBe(token);
    expect(next.ctx.seq).toBe(g.ctx.seq + 1);
  });

  it.each(['c3', 'c-1', 'C0', 'c', 'yes', 'no', 'p0', 'p1', '0', 'a', 'my own words', '', '   ', 'c0 '])('refuses %j (same object back: no write)', (bad) => {
    const g = atSecret();
    expect(play(g, answer(bad))).toBe(g);
  });

  it('a choice slot refuses the events of a text slot: no guess, no next, no verdict', () => {
    const g = atSecret();
    expect(play(g, guess('c0'))).toBe(g);
    expect(play(g, NEXT)).toBe(g);
    expect(play(g, { type: 'verdict', v: 'exact' })).toBe(g);
  });

  it('a card of another type still refuses the choice tokens', () => {
    const yn = play(flash(['yes_no', 'open', 'open', 'open']), NEXT);
    expect(play(yn, answer('c0'))).toBe(yn);
    const who = play(flash(['who_of_two', 'open', 'open', 'open']), NEXT);
    expect(play(who, answer('c1'))).toBe(who);
  });
});

describe('choice: the guess is judged by itself (match 2, miss 0, never a judge)', () => {
  it('the Guess screen shows the choice card, and `next` (reveal) is refused: a choice never reaches judge', () => {
    const g = atGuess('c1');
    expect(g.step).toMatchObject({ kind: 'guess', q: 0 });
    expect(cardOf(g)).toEqual({ id: 1, type: 'choice' });
    expect(secretOf(g)).toBe('c1');
    expect(play(g, NEXT)).toBe(g);
  });

  it.each(['c0', 'c1', 'c2'])('guessing the answer %s scores POINTS.flash.exact and records it', (token) => {
    const scored = play(atGuess(token), guess(token));
    expect(POINTS.flash.exact).toBe(2);
    expect(scored.ctx.scores).toEqual({ t1: POINTS.flash.exact });
    expect(scored.ctx.history.at(-1)).toEqual({ teamId: 't1', stage: 'flash', round: 0, points: 2, max: 2 });
    expect(scored.step.kind).not.toBe('judge');
  });

  it.each([
    ['c1', 'c0'],
    ['c1', 'c2'],
    ['c0', 'c2'],
    ['c2', 'c1'],
  ])('answer %s, guess %s: a miss, 0 points (still recorded)', (picked, guessed) => {
    const scored = play(atGuess(picked), guess(guessed));
    expect(scored.ctx.scores).toEqual({ t1: 0 });
    expect(scored.ctx.history.at(-1)).toEqual({ teamId: 't1', stage: 'flash', round: 0, points: 0, max: 2 });
    expect(scored.step.kind).not.toBe('judge');
  });

  it.each(['c3', 'yes', 'p0', 'A', 'my words', ''])('refuses the guess %j (same object back)', (bad) => {
    const g = atGuess('c1');
    expect(play(g, guess(bad))).toBe(g);
  });

  it('a scored slot drops its secret, as the other closed cards do', () => {
    const scored = play(atGuess('c2'), guess('c2'));
    expect(scored.step.kind).toBe('guess');
    expect('secrets' in scored.step && scored.step.secrets[answerKey('t1', 1)]).toBeUndefined();
  });

  it('no close verdict exists for a choice: only exact (2) or miss (0)', () => {
    const points = ['c0', 'c1', 'c2'].flatMap((a) => ['c0', 'c1', 'c2'].map((b) => play(atGuess(a), guess(b)).ctx.history.at(-1)!.points));
    expect([...new Set(points)].sort()).toEqual([0, 2]);
  });
});

describe('choice: a whole Flash game with the choice card in each of the four slots', () => {
  /** Answer c1 everywhere closed (`a` on text), guess `guessed`; returns every game shown. */
  function run(types: TQuestionType[], guessed: string, roster: TRoster = solo): TGame[] {
    const shown: TGame[] = [];
    let g = flash(types, roster);
    for (let i = 0; i < 400 && g.step.kind !== 'final'; i++) {
      shown.push(g);
      const { step } = g;
      const card = cardOf(g);
      let event: TGameEventBody;
      if (step.kind === 'secret') event = answer(card?.type === 'choice' ? 'c1' : card?.type === 'yes_no' ? 'yes' : 'a');
      else if (step.kind === 'guess') event = card?.type === 'choice' ? guess(guessed) : card?.type === 'yes_no' ? guess('yes') : NEXT;
      else if (step.kind === 'judge') event = { type: 'verdict', v: 'miss' };
      else event = NEXT;
      const next = reduce(g, { ...event, seq: g.ctx.seq });
      expect(next).not.toBe(g); // never stuck
      expect(isGameConsistent(next)).toBe(true);
      g = next;
    }
    shown.push(g);
    return shown;
  }

  it.each([0, 1, 2, 3])('choice at slot %i: plays to the final, scored 2 per match and never judged', (slot) => {
    const types: TQuestionType[] = ['open', 'yes_no', 'open', 'yes_no'];
    types[slot] = 'choice';
    const matched = run(types, 'c1');
    const final = matched.at(-1)!;
    expect(final.step.kind).toBe('final');
    const choiceId = slot + 1;
    // yes_no cards: answered yes, guessed yes (2 each); open cards judged a miss (0); the choice matched (2)
    const yesNo = types.filter((t) => t === 'yes_no').length;
    expect(final.ctx.scores).toEqual({ t1: 2 * (yesNo + 1) });
    expect(matched.some((g) => g.step.kind === 'judge' && cardOf(g)?.id === choiceId)).toBe(false);
    const missed = run(types, 'c0').at(-1)!;
    expect(missed.ctx.scores).toEqual({ t1: 2 * yesNo });
    expect(missed.ctx.history).toHaveLength(FLASH_SET * 2);
  });

  it('with two couples, each is judged on its own pick', () => {
    const g = flash(['choice', 'open', 'open', 'open'], duo);
    let s = play(g, NEXT, NEXT); // answerers gate, handoff -> t1 secret
    expect(cardOf(s)?.type).toBe('choice');
    s = play(s, answer('c0'), NEXT, answer('c2')); // t1 c0, handoff, t2 c2
    expect(s.step).toMatchObject({ kind: 'handoff', q: 1, couple: 0 });
    const secrets = (x: TGame) => ('secrets' in x.step ? x.step.secrets : {});
    expect(secrets(s)[answerKey('t1', 1)]).toBe('c0');
    expect(secrets(s)[answerKey('t2', 1)]).toBe('c2');
    // the second shared question of the round: both couples answer it (open)
    s = play(s, NEXT, answer('x'), NEXT, answer('x'));
    expect(s.step).toMatchObject({ kind: 'gate', side: 'guessers' });
    s = play(s, NEXT);
    expect(s.step).toMatchObject({ kind: 'guess', q: 0, couple: 0 });
    s = play(s, guess('c0')); // t1 matches
    expect(s.ctx.scores).toEqual({ t1: 2, t2: 0 });
    expect(s.step).toMatchObject({ kind: 'guess', q: 0, couple: 1 });
    s = play(s, guess('c0')); // t2 answered c2: miss
    expect(s.ctx.scores).toEqual({ t1: 2, t2: 0 });
  });
});
