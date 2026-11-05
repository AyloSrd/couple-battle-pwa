import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { newGame, type TMode, type TRoster } from '@/shared/game';
import type { TQuestion } from '@/shared/questions';
import { createSaveStore } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { createTestApp, TestProviders, type TTestApp } from '@/test/renderApp';
import { expectSynced } from '@/test/expectSynced';
import { PlayView } from './index';

const solo: TRoster = [{ teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bo'] }];
const q = (id: number, type: TQuestion['type'], you: string): TQuestion => ({ id, theme: 'childhood', difficulty: 'easy', type, you, name: `${you} {name}` });

function mountPlay(mode: TMode, deck: TQuestion[], app: TTestApp = createTestApp({ questions: deck })) {
  if (!app.store.get().game) app.store.startGame(newGame({ roster: solo, mode, difficulty: 'mix', themes: [], deck }));
  const root = createRootRoute({
    component: () => (
      <TestProviders app={app}>
        <Outlet />
      </TestProviders>
    ),
  });
  const routeTree = root.addChildren([
    createRoute({ getParentRoute: () => root, path: '/', component: () => <p>home</p> }),
    createRoute({ getParentRoute: () => root, path: '/mode', component: () => <p>mode</p> }),
    createRoute({ getParentRoute: () => root, path: '/play', component: PlayView }),
  ]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/play'] }) });
  const view = render(<RouterProvider router={router} />);
  return { app, view };
}

const flush = () => act(async () => {});

describe('PlayView — the machine end to end, on the save store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Dilemma: READY runs the UI countdown once (a second tap included), then resolve → final finishes the game', async () => {
    const { app } = mountPlay('dilemma', [q(7, 'who_of_two', 'Who snores?')]);
    const synced = () => expectSynced(app.store, app.api);
    expect(await screen.findByText('Who snores?')).toBeInTheDocument(); // text from the bank, by id
    synced();

    const ready = screen.getByRole('button', { name: 'READY!' });
    fireEvent.click(ready);
    fireEvent.click(ready);
    act(() => {
      vi.advanceTimersByTime(3 * 700 + 1500 + 100);
    });
    synced();
    expect(app.store.get().game?.ctx.seq).toBe(1); // the countdown dispatched `next` once
    fireEvent.click(await screen.findByRole('button', { name: /MATCH/ }));
    await flush();
    synced();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('New best: 1 pts!');
    expect(app.api.raw('game')).toBeNull(); // finished: nothing left to resume
    expect(app.store.get().game?.step.kind).toBe('final'); // memory keeps it for the Final screen
    expect(app.store.get().profile).toMatchObject({ seenIds: [7], soloBest: { dilemma: 1 } });
  });

  it('Flash: closed answers are stored as tokens, a double tap never skips a screen, every move is saved', async () => {
    const { app } = mountPlay('flash', [q(1, 'yes_no', 'Do you snore?'), q(2, 'open', 'Your dream trip?')]);
    const synced = () => expectSynced(app.store, app.api);
    const itsMe = await screen.findByRole('button', { name: "It's me, Ana!" });
    fireEvent.click(itsMe);
    fireEvent.click(itsMe); // a second tap on the departed gate moves nothing (the reducer tests pin the seq guard)
    synced();
    fireEvent.click(await screen.findByRole('button', { name: /Yes$/ }));
    await flush();
    synced();
    // still on the answerer's screens: Q2 (open) waits for its text
    expect(await screen.findByText('Your dream trip?')).toBeInTheDocument();
    expect(app.store.get().game).toMatchObject({ step: { kind: 'secret', q: 1, secrets: { 't1|1': 'yes' } }, ctx: { seq: 2 } });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Kyoto  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lock my answer/ }));
    synced();
    fireEvent.click(await screen.findByRole('button', { name: 'Done!' }));
    await flush();
    synced();
    expect(app.store.get().game).toMatchObject({ step: { kind: 'guess', q: 0, secrets: { 't1|1': 'yes', 't1|2': 'Kyoto' } } });

    // closed question: auto-judged on the guesser's pick, against the token
    fireEvent.click(await screen.findByRole('button', { name: /Yes$/ }));
    expect(document.querySelector('.cb-flash-card--reveal')).toHaveClass('is-match');
    synced();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    synced();
    expect(document.querySelector('.cb-score-pop')).toHaveTextContent('+2'); // GF2: the points land visibly
    // open question: reveal, then the table judges
    fireEvent.click(await screen.findByRole('button', { name: /REVEAL/ }));
    synced();
    expect(await screen.findByText('Kyoto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /NAILED IT/ }));
    await flush();
    synced();

    expect(await screen.findByRole('button', { name: 'Next round →' })).toBeInTheDocument();
    const board = app.store.get().game;
    expect(board?.step).toEqual({ kind: 'scoreboard' }); // the round's secrets are gone
    expect(board?.ctx.scores).toEqual({ t1: 4 });
  });

  it('Dilemma: 3-2-1 on the first question, 2-1 on the next; a match pops "+1" once, a miss pops nothing', async () => {
    const deck = [q(1, 'who_of_two', 'Who snores?'), q(2, 'who_of_two', 'Who cooks?'), q(3, 'who_of_two', 'Who sings?'), q(4, 'who_of_two', 'Who naps?')];
    mountPlay('dilemma', deck);
    const numeral = () => document.querySelector('.cb-numeral')?.textContent;
    const pop = () => document.querySelector('.cb-score-pop');
    const runCountdown = () =>
      act(() => {
        vi.advanceTimersByTime(3 * 700 + 1500 + 100);
      });

    fireEvent.click(await screen.findByRole('button', { name: 'READY!' }));
    expect(numeral()).toBe('3');
    runCountdown();
    fireEvent.click(await screen.findByRole('button', { name: /MATCH/ }));
    await flush();
    expect(pop()).toHaveTextContent('+1');

    fireEvent.click(await screen.findByRole('button', { name: 'READY!' }));
    expect(numeral()).toBe('2'); // the repeat countdown starts at 2
    runCountdown();
    await screen.findByRole('button', { name: /Missed/ });
    expect(pop()).toBeNull(); // the countdown unmounted it: the old "+1" never replays on resolve
    fireEvent.click(screen.getByRole('button', { name: /Missed/ }));
    await flush();
    expect(pop()).toBeNull();
  });

  it('Restart keeps the deck and moves seq on, so no event of the old game can apply', async () => {
    const { app } = mountPlay('dilemma', [q(7, 'who_of_two', 'Who snores?'), q(8, 'who_of_two', 'Who cooks?')]);
    fireEvent.click(await screen.findByRole('button', { name: 'READY!' }));
    act(() => {
      vi.advanceTimersByTime(3 * 700 + 1500 + 100);
    });
    const before = app.store.get().game;
    expect(before?.ctx.seq).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Paused' }));
    fireEvent.click(await screen.findByRole('button', { name: /Restart/i }));
    const after = app.store.get().game;
    expect(after?.step).toEqual({ kind: 'ask', q: 0 });
    expect(after?.ctx.deck).toEqual(before?.ctx.deck);
    expect(after?.ctx.seq).toBe(2);
    expectSynced(app.store, app.api);
  });

  it('a relaunch mid-game (a new store over the same storage) resumes on the very screen it left', async () => {
    const deck = [q(1, 'yes_no', 'Do you snore?'), q(2, 'open', 'Your dream trip?')];
    const first = mountPlay('flash', deck);
    fireEvent.click(await screen.findByRole('button', { name: "It's me, Ana!" }));
    fireEvent.click(await screen.findByRole('button', { name: /Yes$/ }));
    await flush();
    const left = first.app.store.get().game;
    first.view.unmount();

    const api = createSaveMemoryApi(first.app.storage);
    const store = createSaveStore(api, api.load());
    store.recover(() => true);
    expect(store.get().game).toEqual(left);
    mountPlay('flash', deck, { ...first.app, api, store, container: { ...first.app.container, saveApi: api } });
    expect(await screen.findByText('Your dream trip?')).toBeInTheDocument();
  });

  it('Rematch keeps the couples for Mode and clears the finished game; New game clears the draft too', async () => {
    const { app } = mountPlay('dilemma', [q(7, 'who_of_two', 'Who snores?')]);
    fireEvent.click(await screen.findByRole('button', { name: 'READY!' }));
    act(() => {
      vi.advanceTimersByTime(3 * 700 + 1500 + 100);
    });
    fireEvent.click(await screen.findByRole('button', { name: /MATCH/ }));
    await flush();
    fireEvent.click(await screen.findByRole('button', { name: /Rematch/i }));
    await flush();
    expect(app.draft.get()).toEqual({ roster: solo, mode: null });
    expect(app.store.get().game).toBeNull();
    expectSynced(app.store, app.api);
    expect(await screen.findByText('mode')).toBeInTheDocument();
  });
});
