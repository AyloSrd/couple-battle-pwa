import { StrictMode, type FC } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { soundEngine } from '@/shared/sound';
import { createTestApp, TestProviders } from '@/test/renderApp';
import { probeListeners } from '@/test/listenerProbe';
import { HomeView } from './index';

function setup() {
  const music = vi.spyOn(soundEngine, 'music');
  const app = createTestApp({ lang: 'en' });
  const Root: FC = () => (
    <TestProviders app={app}>
      <Outlet />
    </TestProviders>
  );
  const rootRoute = createRootRoute({ component: Root });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomeView });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const ui = (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
  return { ui, music };
}

describe('Home leaks (StrictMode)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // jsdom has no matchMedia (the install hint reads display-mode: standalone).
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stops the menu music and releases every listener/timer on unmount', async () => {
    const warm = setup();
    const first = render(warm.ui);
    await screen.findByRole('button', { name: 'PLAY' });
    first.unmount(); // warm-up: React / router one-time registrations

    const probe = probeListeners();
    const { ui, music } = setup();
    const { unmount } = render(ui);
    await screen.findByRole('button', { name: 'PLAY' });
    // sound is on in the saved settings → the menu music starts
    expect(music).toHaveBeenCalledWith('mus.menu');

    unmount();
    expect(music).toHaveBeenLastCalledWith(null);

    // The install-prompt store must not keep (or notify) an unmounted Home.
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(errors).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(vi.getTimerCount()).toBe(0);
    // Router history listeners (popstate/…) are registered per mounted router and removed on unmount.
    expect(probe.unbalanced()).toEqual([]);
    probe.restore();
  });
});
