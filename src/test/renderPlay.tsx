import { render } from '@testing-library/react';
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { newGame, type TMode, type TRoster } from '@/shared/game';
import type { TQuestion } from '@/shared/questions';
import { PlayView } from '@/views/Play';
import { createTestApp, TestProviders, type TTestApp } from './renderApp';

export const soloRoster: TRoster = [{ teamId: 't1', avatarId: 'otters', players: ['Ana', 'Bo'] }];

/** `/play` on the real router and the real save store: a new game over `deck` (the bank is `deck` too) unless the app already holds one. */
export function mountPlay(mode: TMode, deck: TQuestion[], app: TTestApp = createTestApp({ questions: deck })) {
  if (!app.store.get().game) app.store.startGame(newGame({ roster: soloRoster, mode, difficulty: 'mix', themes: [], deck }));
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
