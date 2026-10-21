import { StrictMode, useEffect, useState, type FC, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { SaveApiProvider } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { QuestionsApiProvider } from '@/shared/questions';
import { createQuestionsMemoryApi } from '@/shared/questions/api/memory';
import { DraftGameProvider, useDraftGame } from '@/shared/session';
import { Mode, THEME_IDS } from '@/shared/game';
import { DifficultyView } from './index';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const QUESTIONS = THEME_IDS.flatMap((theme, i) =>
  (['easy', 'medium', 'hard'] as const).map((difficulty, j) => ({
    id: i * 3 + j + 1,
    theme,
    difficulty,
    type: 'open' as const,
    you: `Q ${theme} ${difficulty}`,
    name: `Q {name} ${theme} ${difficulty}`,
  })),
);

/** Seeds the draft the way Setup + Mode would, then renders the view. */
const Seeded: FC<{ children: ReactNode }> = ({ children }) => {
  const { draft, setRoster, setMode } = useDraftGame();
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    setRoster([{ teamId: 't1', avatarId: THEME_AVATAR, players: ['A', 'B'] }]);
    setMode(Mode.Flash);
    setSeeded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- test seeding, run once
  return seeded && draft.roster && draft.mode ? <>{children}</> : null;
};
const THEME_AVATAR = 'otters' as const;

type TListenerCounts = Record<string, { add: number; remove: number }>;

function spyListeners(): { counts: TListenerCounts; restore: () => void } {
  const counts: TListenerCounts = {};
  const bump = (type: string, kind: 'add' | 'remove') => {
    counts[type] ??= { add: 0, remove: 0 };
    counts[type][kind] += 1;
  };
  const orig = new Map<EventTarget, { add: EventTarget['addEventListener']; remove: EventTarget['removeEventListener'] }>(
    [window, document].map((t) => [t, { add: t.addEventListener, remove: t.removeEventListener }]),
  );
  const spies = [window, document].flatMap((target) => [
    vi.spyOn(target, 'addEventListener').mockImplementation(function (this: unknown, ...args: unknown[]) {
      bump(String(args[0]), 'add');
      return orig.get(target)!.add.apply(this, args as never);
    }),
    vi.spyOn(target, 'removeEventListener').mockImplementation(function (this: unknown, ...args: unknown[]) {
      bump(String(args[0]), 'remove');
      return orig.get(target)!.remove.apply(this, args as never);
    }),
  ]);
  return { counts, restore: () => spies.forEach((s) => s.mockRestore()) };
}

describe('DifficultyView — leak check (StrictMode, fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigate.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves no timer and no unbalanced listener after driving the view and unmounting', async () => {
    // gcTime: Infinity — react-query's own cache-gc timers (5 min) would otherwise
    // show up as pending timers; this test is about timers the component owns.
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { gcTime: Infinity },
      },
    });
    const { counts, restore } = spyListeners();

    const view = render(
      <StrictMode>
        <QueryClientProvider client={qc}>
          <SaveApiProvider api={createSaveMemoryApi()}>
            <SoundApiProvider api={createSoundNoopApi()}>
              <QuestionsApiProvider api={createQuestionsMemoryApi(QUESTIONS)}>
                <LangProvider initialLang="en">
                  <DraftGameProvider>
                    <Seeded>
                      <DifficultyView />
                    </Seeded>
                  </DraftGameProvider>
                </LangProvider>
              </QuestionsApiProvider>
            </SoundApiProvider>
          </SaveApiProvider>
        </QueryClientProvider>
      </StrictMode>,
    );
    const flush = () => act(() => vi.advanceTimersByTimeAsync(1000));

    await flush();
    // Drive: pick a difficulty, open the themes panel, toggle a theme, start.
    fireEvent.click(screen.getAllByRole('radio')[1]!);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    await flush();
    const themeChips = screen.getAllByRole('button', { pressed: true });
    fireEvent.click(themeChips[themeChips.length - 1]!);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /let's go/i }));
    await flush();
    expect(navigate).toHaveBeenCalledWith({ to: '/play' });

    view.unmount();
    qc.clear();
    restore();

    expect(vi.getTimerCount()).toBe(0);
    // React DOM installs one shared `selectionchange` listener per document on the
    // first root and never removes it — framework-owned, not the component's.
    const owned = Object.entries(counts).filter(([type]) => type !== 'selectionchange');
    for (const [type, { add, remove }] of owned) {
      expect(remove, `listener "${type}" add/remove balance`).toBe(add);
    }
  });
});
