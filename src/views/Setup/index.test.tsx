import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { DraftGameProvider, useDraftGame } from '@/shared/session';
import { SetupView } from './index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DraftProbe = () => <p data-testid="roster">{useDraftGame().draft.roster?.length ?? 'none'}</p>;

/** Setup → Mode where the Mode route takes a while to resolve (a lazy chunk, in the real app). */
function mountSetup() {
  const root = createRootRoute({
    component: () => (
      <LangProvider initialLang="fr">
        <SoundApiProvider api={createSoundNoopApi()}>
          <DraftGameProvider>
            <DraftProbe />
            <Outlet />
          </DraftGameProvider>
        </SoundApiProvider>
      </LangProvider>
    ),
  });
  const routeTree = root.addChildren([
    createRoute({ getParentRoute: () => root, path: '/', component: SetupView }),
    createRoute({
      getParentRoute: () => root,
      path: '/mode',
      loader: () => sleep(300),
      component: () => <p>mode screen</p>,
    }),
  ]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

describe('V-Setup → Mode hand-off', () => {
  it('seeds the roster and navigates once, without a render loop while the Mode route loads', async () => {
    // Keep only message strings: a runaway loop logs thousands of times and the full call args would exhaust memory.
    const messages: string[] = [];
    const errors = vi.spyOn(console, 'error').mockImplementation((message: unknown) => {
      messages.push(String(message).slice(0, 80));
    });
    mountSetup();

    fireEvent.click(await screen.findByRole('button', { name: '1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'lions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    const [first, second] = await screen.findAllByRole('textbox');
    fireEvent.change(first as HTMLElement, { target: { value: 'Ana' } });
    fireEvent.change(second as HTMLElement, { target: { value: 'Bo' } });
    // Outside `act`: act drains React's queue synchronously, so a runaway effect loop would hang the
    // test instead of failing it. The real scheduler yields between renders, like the browser does.
    const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    actEnv.IS_REACT_ACT_ENVIRONMENT = false;
    screen.getByRole('button', { name: /Tout le monde/ }).click();
    await sleep(600);
    actEnv.IS_REACT_ACT_ENVIRONMENT = true;

    errors.mockRestore();
    expect(messages.filter((m) => m.includes('Maximum update depth'))).toEqual([]);
    expect(await screen.findByText('mode screen')).toBeInTheDocument();
    expect(screen.getByTestId('roster')).toHaveTextContent('1');
  });
});
