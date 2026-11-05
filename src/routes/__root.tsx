import type { FC } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { TBooted } from '../app/boot';
import { AppProviders, Shell } from '../app/Shell';
import { CrashScreen } from '../app/CrashScreen';

/** Router context: the booted app (data ports, save store, draft) — route guards read it. */
export type TRouterContext = TBooted;

const RootLayout: FC = () => {
  const { container, store, draft } = Route.useRouteContext();
  return (
    <AppProviders container={container} store={store} draft={draft}>
      <Shell>
        <Outlet />
      </Shell>
    </AppProviders>
  );
};

export const Route = createRootRouteWithContext<TRouterContext>()({
  component: RootLayout,
  // Renders outside the providers above: provider-free by design.
  errorComponent: CrashScreen,
});
