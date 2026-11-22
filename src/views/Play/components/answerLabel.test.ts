import { describe, expect, it } from 'vitest';
import { en } from '@/data/strings.en';
import { fr } from '@/data/strings.fr';
import { interpolate, type TFunc } from '@/shared/i18n';
import type { TQuestion } from '@/shared/questions/domain/types';
import { gameAt, testRoster } from '@/test/gameStates';
import { answerLabel, choiceLetter, closedChoices } from './answerLabel';

/**
 * What a stored answer reads as, and the buttons of a closed card. Contract for `choice`: the question (a bank row, in the ACTIVE
 * language) is passed as the LAST, optional argument of both functions; `cN` reads as `options[N]`. Calls without it (the two-button
 * screens today) keep working unchanged. `choiceLetter(n)` is the letter a choice answer goes by: A, B, C.
 */

const tIn = (dict: Record<string, string>): TFunc => (key, vars) => interpolate(dict[key] ?? key, vars);
const tEn = tIn(en as Record<string, string>);
const tFr = tIn(fr as Record<string, string>);
const team = testRoster[0];

const choiceEn: TQuestion = { id: 2, theme: 'homeDaily', difficulty: 'easy', type: 'choice', question: 'The door slams. First reflex?', options: ['Check my pockets', 'Call at once', 'Ring the neighbours'] };
const choiceFr: TQuestion = { ...choiceEn, question: 'La porte claque. Premier réflexe ?', options: ['Je fouille mes poches', "J'appelle tout de suite", 'Je sonne chez les voisins'] } as TQuestion;

describe('answerLabel', () => {
  it('yes_no and who_of_two read as before', () => {
    expect(answerLabel('yes', 'yes_no', team, tEn)).toBe(en['common.yes']);
    expect(answerLabel('no', 'yes_no', team, tFr)).toBe(fr['common.no']);
    expect(answerLabel('p0', 'who_of_two', team, tEn)).toBe('Ana');
    expect(answerLabel('p1', 'who_of_two', team, tEn)).toBe('Bo');
    expect(answerLabel('typed', 'open', team, tEn)).toBe('typed');
    expect(answerLabel(undefined, 'open', team, tEn)).toBeUndefined();
  });

  it.each([
    ['c0', 'Check my pockets'],
    ['c1', 'Call at once'],
    ['c2', 'Ring the neighbours'],
  ])('a choice card: %s is the option text of the question', (token, text) => {
    expect(answerLabel(token, 'choice', team, tEn, choiceEn)).toBe(text);
  });

  it('is language-free in storage: the same token reads in the language of the question it is given', () => {
    expect(answerLabel('c1', 'choice', team, tFr, choiceFr)).toBe("J'appelle tout de suite");
    expect(answerLabel('c1', 'choice', team, tEn, choiceEn)).toBe('Call at once');
  });

  it('a missing answer is undefined on a choice card too; a choice answer never reads as its raw token', () => {
    expect(answerLabel(undefined, 'choice', team, tEn, choiceEn)).toBeUndefined();
    expect(answerLabel('c1', 'choice', team, tEn)).toBeUndefined(); // no question at hand
  });
});

describe('choiceLetter', () => {
  it('is A, B, C by place', () => {
    expect([0, 1, 2].map(choiceLetter)).toEqual(['A', 'B', 'C']);
  });
});

describe('closedChoices', () => {
  const secretOn = (type: 'yes_no' | 'who_of_two' | 'open' | 'choice') => {
    const base = gameAt('secret');
    return { ...base, ctx: { ...base.ctx, deck: [{ id: 2, type }, { id: 3, type: 'open' as const }, { id: 4, type: 'open' as const }, { id: 5, type: 'open' as const }] } };
  };

  it('yes_no: two entries, as today', () => {
    expect(closedChoices(secretOn('yes_no'), tEn)).toEqual([
      { token: 'yes', label: en['common.yes'] },
      { token: 'no', label: en['common.no'] },
    ]);
  });

  it('who_of_two: the couple names, as today', () => {
    expect(closedChoices(secretOn('who_of_two'), tEn)).toEqual([
      { token: 'p0', label: 'Ana' },
      { token: 'p1', label: 'Bo' },
    ]);
  });

  it('an open question has no closed answers', () => {
    expect(closedChoices(secretOn('open'), tEn)).toBeNull();
  });

  it('a choice card: three entries c0..c2 whose labels are the option texts, in the language of the question', () => {
    expect(closedChoices(secretOn('choice'), tEn, choiceEn)).toEqual([
      { token: 'c0', label: 'Check my pockets' },
      { token: 'c1', label: 'Call at once' },
      { token: 'c2', label: 'Ring the neighbours' },
    ]);
    expect(closedChoices(secretOn('choice'), tFr, choiceFr)?.map((c) => c.label)).toEqual(['Je fouille mes poches', "J'appelle tout de suite", 'Je sonne chez les voisins']);
    expect(closedChoices(secretOn('choice'), tFr, choiceFr)?.map((c) => c.token)).toEqual(['c0', 'c1', 'c2']);
  });

  it('a choice card whose question is not there (bank not loaded) offers nothing rather than blank buttons', () => {
    expect(closedChoices(secretOn('choice'), tEn)).toBeNull();
  });
});
