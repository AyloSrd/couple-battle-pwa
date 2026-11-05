import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { newGame } from '@/shared/game';
import { createTestApp, type TTestApp } from '@/test/renderApp';
import { routeTree } from '../routeTree.gen';

const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['A', 'B'] as [string, string] }];
const game = newGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: [{ id: 1, type: 'who_of_two' }] });

/** Where a cold load of `path` lands, with the app in the given state (guards only, nothing rendered). */
async function land(path: string, app: TTestApp = createTestApp()) {
  const router = createRouter({ routeTree, context: app, history: createMemoryHistory({ initialEntries: [path] }) });
  await router.load();
  return router.state.location.pathname;
}

describe('route guards (beforeLoad → redirect)', () => {
  it('/mode needs a roster in the draft (a reload has lost it)', async () => {
    expect(await land('/mode')).toBe('/setup');
    expect(await land('/mode', createTestApp({ draft: { roster } }))).toBe('/mode');
  });

  it('/difficulty needs a roster and a mode', async () => {
    expect(await land('/difficulty', createTestApp({ draft: { roster } }))).toBe('/setup');
    expect(await land('/difficulty', createTestApp({ draft: { roster, mode: 'flash' } }))).toBe('/difficulty');
  });

  it('/play needs a game in the store — a finished one counts (Final screen, Rematch)', async () => {
    expect(await land('/play')).toBe('/');
    const running = createTestApp();
    running.store.startGame(game);
    expect(await land('/play', running)).toBe('/play');
    const finished = createTestApp();
    finished.store.startGame({ ...game, step: { kind: 'final' } });
    expect(await land('/play', finished)).toBe('/play');
  });

  it('/setup has no guard', async () => {
    expect(await land('/setup')).toBe('/setup');
  });
});
