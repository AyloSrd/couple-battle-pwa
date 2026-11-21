import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { createSaveStore } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { choiceQuestion, classicQuestion } from '@/test/gameStates';
import { expectSynced } from '@/test/expectSynced';
import { mountPlay } from '@/test/renderPlay';

/**
 * A choice card on the REAL `/play` route (router, save store, bank by id): the answerer taps a card (it locks the token), the guesser
 * picks, sees the result in place, and Next scores it (match 2 / miss 0, never a judge); the game is saved at every move and resumes.
 * Flash, one couple (Ana answers, Bo guesses), deck: the choice card (id 1), then a yes / no card (id 2).
 */

const choice = choiceQuestion(1);
const yesNo = { ...classicQuestion('yes_no'), id: 2, you: 'Do you snore?', name: 'Does {name} snore?' };
const DECK = [choice, yesNo];
const card = (n: number) => `${'ABC'[n]}. ${choice.options[n]}`;
const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

/** Through the answerers' screens: Ana locks `c<n>` on the choice card, then "yes". Ends on the guessers' pass-back gate. */
async function answerAll(app: ReturnType<typeof mountPlay>['app'], n: number) {
  fireEvent.click(await screen.findByRole('button', { name: "It's me, Ana!" }));
  fireEvent.click(await screen.findByRole('button', { name: card(n) }));
  await flush();
  fireEvent.click(await screen.findByRole('button', { name: /Yes$/ }));
  await flush();
  expectSynced(app.store, app.api);
  fireEvent.click(await screen.findByRole('button', { name: 'Done!' }));
  await flush();
}

describe('PlayView, a choice question end to end', () => {
  it('the answer screen: the question, three cards, no field; a tap locks the token (saved, one move) and moves on', async () => {
    const { app } = mountPlay('flash', DECK);
    fireEvent.click(await screen.findByRole('button', { name: "It's me, Ana!" }));
    expect(await screen.findByText(choice.question)).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label')).filter((n) => /^[ABC]\. /.test(n ?? ''))).toEqual([0, 1, 2].map(card));
    expect(screen.queryByRole('textbox')).toBeNull();
    const before = app.store.get().game!.ctx.seq;
    const second = screen.getByRole('button', { name: card(1) });
    act(() => {
      second.click();
      second.click(); // a double tap: the reducer's seq turns the second away
    });
    await flush();
    expect(app.store.get().game).toMatchObject({ step: { kind: 'secret', q: 1, secrets: { 't1|1': 'c1' } }, ctx: { seq: before + 1 } });
    expectSynced(app.store, app.api);
    expect(await screen.findByText(yesNo.you)).toBeInTheDocument(); // the next question, a yes / no
  });

  it('a miss: the same question under the lead, the pick shown in place, "Missed!", Next scores 0 and shows no pop', async () => {
    const { app } = mountPlay('flash', DECK);
    await answerAll(app, 1);
    expect(screen.getByText(choice.question)).toBeInTheDocument(); // not rewritten about Ana
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Your turn Bo: guess what Ana answered!');
    fireEvent.click(screen.getByRole('button', { name: card(0) }));
    expect(screen.getByText(/Missed!/)).toBeInTheDocument();
    expect(document.querySelectorAll('.cb-choice-list')).toHaveLength(1);
    expect(document.querySelector('.cb-choice[data-token="c1"]')).toHaveClass('is-truth');
    expect(document.querySelector('.cb-flash-card--reveal')).toBeNull();
    expect(app.store.get().game).toMatchObject({ step: { kind: 'guess', q: 0 } }); // a pick is not a move
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await flush();
    expect(app.store.get().game?.ctx.scores).toEqual({ t1: 0 });
    expect(app.store.get().game?.ctx.history.at(-1)).toMatchObject({ points: 0, max: 2 });
    expect(document.querySelector('.cb-score-pop')).toBeNull();
    expect(app.store.get().game?.step).toMatchObject({ kind: 'guess', q: 1 }); // straight to the yes / no card, never a judge
    expectSynced(app.store, app.api);
  });

  it('a match: the pick is mint on the real answer, Next scores +2 with one pop, and the game moves on to the next card', async () => {
    const { app } = mountPlay('flash', DECK);
    await answerAll(app, 2);
    fireEvent.click(screen.getByRole('button', { name: card(2) }));
    expect(screen.getByText(/MATCH! \+2/)).toBeInTheDocument();
    expect(document.querySelector('.cb-choice[data-token="c2"]')).toHaveClass('is-truth', 'is-match');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await flush();
    expect(app.store.get().game?.ctx.scores).toEqual({ t1: 2 });
    expect(app.store.get().game?.ctx.history.at(-1)).toMatchObject({ points: 2, max: 2 });
    expect(document.querySelectorAll('.cb-score-pop')).toHaveLength(1);
    expect(document.querySelector('.cb-score-pop')).toHaveTextContent('+2');
    expect(await screen.findByRole('button', { name: /Yes$/ })).toBeInTheDocument(); // the yes / no guess
    expectSynced(app.store, app.api);
  });

  it('a relaunch on the guess of a choice card resumes it: the question, the three cards, and the locked token still judges the pick', async () => {
    const first = mountPlay('flash', DECK);
    await answerAll(first.app, 1);
    expect(screen.getAllByRole('button', { name: /^[ABC]\. / })).toHaveLength(3);
    const left = first.app.store.get().game;
    first.view.unmount();

    const api = createSaveMemoryApi(first.app.storage);
    const store = createSaveStore(api, api.load());
    store.recover(() => true);
    expect(store.get().game).toEqual(left);
    const { app } = mountPlay('flash', DECK, { ...first.app, api, store, container: { ...first.app.container, saveApi: api } });
    expect(await screen.findByText(choice.question)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: card(1) }));
    expect(screen.getByText(/MATCH! \+2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await flush();
    expect(app.store.get().game?.ctx.scores).toEqual({ t1: 2 });
  });
});
