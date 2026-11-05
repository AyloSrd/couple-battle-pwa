import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Mode, THEME_IDS } from '@/shared/game';
import { renderWithApp } from '@/test/renderApp';
import { expectSynced } from '@/test/expectSynced';
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
    const { counts, restore } = spyListeners();

    // The draft as Setup + Mode leave it.
    const view = renderWithApp(<DifficultyView />, {
      strict: true,
      questions: QUESTIONS,
      draft: { roster: [{ teamId: 't1', avatarId: 'otters', players: ['A', 'B'] }], mode: Mode.Flash },
    });
    const flush = () => act(() => vi.advanceTimersByTimeAsync(1000));

    await flush();
    // Drive: pick a difficulty, open the themes panel, toggle a theme, start.
    fireEvent.click(screen.getAllByRole('radio')[1]!);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    await flush();
    const themeChips = screen.getAllByRole('button', { pressed: true });
    fireEvent.click(themeChips[themeChips.length - 1]!);
    await flush();
    const start = screen.getByRole('button', { name: /let's go/i });
    fireEvent.click(start);
    fireEvent.click(start); // S8: a double tap starts one game
    await flush();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ to: '/play', replace: true });
    const game = view.app.store.get().game;
    expect(game?.ctx).toMatchObject({ mode: 'flash', difficulty: 'easy', seq: 0 });
    expect(game?.ctx.deck).toHaveLength(4);
    expectSynced(view.app.store, view.app.api);

    view.unmount();
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
