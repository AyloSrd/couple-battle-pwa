import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { WakeLockApiProvider } from '@/shared/wakeLock';
import { createWakeLockNoopApi } from '@/shared/wakeLock/api/noop';
import { QuestionsApiProvider } from '@/shared/questions/provider';
import { createQuestionsMemoryApi } from '@/shared/questions/api/memory';
import { SaveApiProvider, newGameSnapshot, type TSaveApi } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { DraftGameProvider } from '@/shared/session';
import type { TMode, TRoster } from '@/shared/game';
import type { TQuestion } from '@/shared/questions';
import { PlayView } from './index';

const solo: TRoster = [{ teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bo'] }];
const q = (id: number, type: TQuestion['type'], you: string): TQuestion => ({ id, theme: 'childhood', difficulty: 'easy', type, you, name: `${you} {name}` });

function mountPlay(mode: TMode, deck: TQuestion[]) {
  const save = createSaveMemoryApi({ gameSnapshot: newGameSnapshot({ roster: solo, mode, difficulty: 'mix', themes: [], deck }) });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={qc}>
        <QuestionsApiProvider api={createQuestionsMemoryApi(deck)}>
          <SaveApiProvider api={save}>
            <SoundApiProvider api={createSoundNoopApi()}>
              <WakeLockApiProvider api={createWakeLockNoopApi()}>
                <LangProvider initialLang="en">
                  <DraftGameProvider>
                    <Outlet />
                  </DraftGameProvider>
                </LangProvider>
              </WakeLockApiProvider>
            </SoundApiProvider>
          </SaveApiProvider>
        </QuestionsApiProvider>
      </QueryClientProvider>
    ),
  });
  const routeTree = root.addChildren([
    createRoute({ getParentRoute: () => root, path: '/', component: () => <p>home</p> }),
    createRoute({ getParentRoute: () => root, path: '/play', component: PlayView }),
  ]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/play'] }) });
  render(<RouterProvider router={router} />);
  return save;
}

const stored = async (save: TSaveApi) => (await save.get('gameSnapshot'))?.game;
const flush = () => act(async () => {});

describe('PlayView — the machine end to end (memory adapters)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Dilemma: READY runs the UI countdown once (a second tap included), then resolve → final commits', async () => {
    const save = mountPlay('dilemma', [q(7, 'who_of_two', 'Who snores?')]);
    expect(await screen.findByText('Who snores?')).toBeInTheDocument(); // text from the bank, by id

    const ready = screen.getByRole('button', { name: 'READY!' });
    fireEvent.click(ready);
    fireEvent.click(ready);
    act(() => {
      vi.advanceTimersByTime(3 * 700 + 1500 + 100);
    });
    fireEvent.click(await screen.findByRole('button', { name: /MATCH/ }));
    await flush();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('New best: 1 pts!');
    expect(await save.get('gameSnapshot')).toBeNull();
    expect(await save.get('seenQuestionIds')).toEqual([7]);
    expect((await save.get('soloBest')).dilemma).toBe(1);
  });

  it('Flash: closed answers are stored as tokens, a double tap never skips a screen, every move is saved', async () => {
    const save = mountPlay('flash', [q(1, 'yes_no', 'Do you snore?'), q(2, 'open', 'Your dream trip?')]);
    const itsMe = await screen.findByRole('button', { name: "It's me, Ana!" });
    fireEvent.click(itsMe);
    fireEvent.click(itsMe); // a second tap on the departed gate moves nothing (the reducer tests pin the seq guard)
    fireEvent.click(await screen.findByRole('button', { name: /Yes$/ }));
    await flush();
    // still on the answerer's screens: Q2 (open) waits for its text
    expect(await screen.findByText('Your dream trip?')).toBeInTheDocument();
    expect(await stored(save)).toMatchObject({ step: { kind: 'secret', q: 1, secrets: { 't1|1': 'yes' } }, ctx: { seq: 2 } });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Kyoto  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lock my answer/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Done!' }));
    await flush();
    expect(await stored(save)).toMatchObject({ step: { kind: 'guess', q: 0, secrets: { 't1|1': 'yes', 't1|2': 'Kyoto' } } });

    // closed question: auto-judged on the guesser's pick, against the token
    fireEvent.click(await screen.findByRole('button', { name: /Yes$/ }));
    expect(document.querySelector('.cb-flash-card--reveal')).toHaveClass('is-match');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // open question: reveal, then the table judges
    fireEvent.click(await screen.findByRole('button', { name: /REVEAL/ }));
    expect(await screen.findByText('Kyoto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /NAILED IT/ }));
    await flush();

    expect(await screen.findByRole('button', { name: 'Next round →' })).toBeInTheDocument();
    const board = await stored(save);
    expect(board?.step).toEqual({ kind: 'scoreboard' }); // the round's secrets are gone
    expect(board?.ctx.scores).toEqual({ t1: 4 });
  });
});
