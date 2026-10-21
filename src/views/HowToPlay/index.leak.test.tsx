import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { HowToPlayView } from './index';

type TCall = [string, ...unknown[]];

/** React DOM installs one `selectionchange` listener per document, for its whole lifetime (not ours). */
const REACT_INTERNAL = new Set(['selectionchange']);

/** Net listeners per event type: adds minus removes. */
function balance(adds: TCall[], removes: TCall[]): Record<string, number> {
  const net: Record<string, number> = {};
  for (const [type] of adds) if (!REACT_INTERNAL.has(type)) net[type] = (net[type] ?? 0) + 1;
  for (const [type] of removes) if (!REACT_INTERNAL.has(type)) net[type] = (net[type] ?? 0) - 1;
  return net;
}

async function mountView() {
  const root = createRootRoute();
  const howTo = createRoute({ getParentRoute: () => root, path: '/how-to-play', component: HowToPlayView });
  const home = createRoute({ getParentRoute: () => root, path: '/', component: () => <p>home</p> });
  const router = createRouter({
    routeTree: root.addChildren([home, howTo]),
    history: createMemoryHistory({ initialEntries: ['/how-to-play'] }),
  });
  await router.load();
  return render(
    <StrictMode>
      <LangProvider initialLang="en">
        <SoundApiProvider api={createSoundNoopApi()}>
          <RouterProvider router={router} />
        </SoundApiProvider>
      </LangProvider>
    </StrictMode>,
  );
}

describe('HowToPlayView — leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('leaves no timer and no listener behind after keyboard + scroll + dot interaction and unmount', async () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');

    const view = await mountView();

    // Drive it: arrow keys / Home / End, a scroll event, a dot tap.
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'End' });
      fireEvent.keyDown(window, { key: 'Home' });
      fireEvent.scroll(screen.getByRole('region', { name: 'How to play' }));
      fireEvent.click(screen.getByRole('button', { name: 'Dilemma' }));
      await vi.advanceTimersByTimeAsync(2000);
    });

    view.unmount();
    await vi.advanceTimersByTimeAsync(2000);

    expect(vi.getTimerCount()).toBe(0);

    const keydownNet = balance(
      winAdd.mock.calls.filter(([t]) => t === 'keydown') as TCall[],
      winRemove.mock.calls.filter(([t]) => t === 'keydown') as TCall[],
    );
    expect(keydownNet.keydown ?? 0).toBe(0);
    expect(winAdd.mock.calls.some(([t]) => t === 'keydown')).toBe(true); // the listener did mount

    // Every window/document listener the tree added (router included) is removed again.
    expect(balance(winAdd.mock.calls as TCall[], winRemove.mock.calls as TCall[])).toEqual(
      Object.fromEntries(Object.keys(balance(winAdd.mock.calls as TCall[], [])).map((k) => [k, 0])),
    );
    expect(balance(docAdd.mock.calls as TCall[], docRemove.mock.calls as TCall[])).toEqual(
      Object.fromEntries(Object.keys(balance(docAdd.mock.calls as TCall[], [])).map((k) => [k, 0])),
    );
  });
});
