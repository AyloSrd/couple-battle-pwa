import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { it as italian } from '@/data/strings.it';
import { GameDifficulty, Mode } from '@/shared/game';
import { deckSizeFor, drawDeck } from '@/shared/questions';
import type { TQuestion } from '@/shared/questions';
import { createQuestionsJsonApi } from '@/shared/questions/api/json';
import { ZQuestionSchema } from '@/shared/questions/domain/types';
import { createTestApp } from '@/test/renderApp';
import { mountPlay } from '@/test/renderPlay';

/**
 * P15: with Italian selected a game can start. The REAL Italian bank (the loader reads `src/data/questions.it.json`) feeds `drawDeck`, and the
 * Play screens show Italian text. A seeded rng makes the draw repeatable.
 */

const bank = (): TQuestion[] => createQuestionsJsonApi().list({ lang: 'it' });
const seeded = () => {
  let state = 12345;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};
const deckOf = (questions: TQuestion[], mode: 'flash' | 'dilemma' | 'ultime', couples: number) =>
  drawDeck(questions, { mode, difficulty: GameDifficulty.Mix, themes: [], seenIds: [], size: deckSizeFor(mode, couples) }, seeded());
const textOf = (q: TQuestion) => (q.type === 'choice' ? q.question : q.you);

describe('Italian: a game can start from the real bank', () => {
  it('the Italian bank file parses with the question schema, lines up with the loader, and is not a copy of FR', () => {
    const raw = JSON.parse(readFileSync(path.join(__dirname, '../../data/questions.it.json'), 'utf8')) as unknown[];
    expect(ZQuestionSchema.array().parse(raw)).toHaveLength(bank().length);
    expect(bank()).toHaveLength(1195);
    expect(bank().map((q) => textOf(q))).not.toEqual(createQuestionsJsonApi().list({ lang: 'fr' }).map((q) => textOf(q)));
  });

  it.each([['flash', 2], ['flash', 1], ['dilemma', 2], ['ultime', 2]] as const)('drawDeck draws a full %s deck for %i couple(s)', (mode, couples) => {
    const deck = deckOf(bank(), mode, couples);
    expect(deck).toHaveLength(deckSizeFor(mode, couples));
    expect(new Set(deck.map((q) => q.id)).size).toBe(deck.length);
    for (const q of deck) expect(textOf(q).trim()).not.toBe('');
  });

  it('a Flash deck holds its one choice question, with three Italian options, and the rest are classic questions with their {name} slot', () => {
    const deck = deckOf(bank(), 'flash', 2);
    const choices = deck.filter((q) => q.type === 'choice');
    expect(choices).toHaveLength(1);
    const [choice] = choices;
    if (choice?.type !== 'choice') throw new Error('no choice card');
    expect(choice.question.trim()).not.toBe('');
    expect(choice.options).toHaveLength(3);
    for (const option of choice.options) expect(option.trim()).not.toBe('');
    for (const q of deck) {
      if (q.type === 'open' || q.type === 'yes_no') expect(q.name).toContain('{name}');
    }
  });

  it('Italian questions can be drawn in every difficulty (the draw is never short)', () => {
    for (const difficulty of [GameDifficulty.Easy, GameDifficulty.Medium, GameDifficulty.Hard, GameDifficulty.Mix]) {
      const deck = drawDeck(bank(), { mode: Mode.Flash, difficulty, themes: [], seenIds: [], size: deckSizeFor(Mode.Flash, 2) }, seeded());
      expect({ difficulty, length: deck.length }).toEqual({ difficulty, length: deckSizeFor(Mode.Flash, 2) });
    }
  });
});

describe('Italian: the Play screens show Italian text', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Dilemma: the Ask screen shows the drawn Italian question and the Italian READY button', async () => {
    const deck = deckOf(bank(), 'dilemma', 1);
    mountPlay('dilemma', deck, createTestApp({ lang: 'it', questions: deck }));
    expect(await screen.findByText(textOf(deck[0]!))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: italian['dilemma.ready'] })).toBeInTheDocument();
    expect(italian['dilemma.ready']).not.toBe('READY!');
  });

  it('Flash: the pass gate is in Italian, and the choice card then shows its Italian question and its three Italian options', async () => {
    const deck = deckOf(bank(), 'flash', 1);
    const choice = deck.find((q) => q.type === 'choice');
    if (choice?.type !== 'choice') throw new Error('no choice card');
    const first = [choice, ...deck.filter((q) => q !== choice)];
    mountPlay('flash', first, createTestApp({ lang: 'it', questions: first }));
    fireEvent.click(await screen.findByRole('button', { name: italian['pass.secret.confirm'].replace('{name}', 'Ana') }));
    expect((await screen.findAllByText(choice.question)).length).toBeGreaterThan(0);
    choice.options.forEach((option, n) => expect(screen.getByRole('button', { name: `${'ABC'[n]}. ${option}` })).toBeInTheDocument());
  });
});
