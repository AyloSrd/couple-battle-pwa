import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { FC } from 'react';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Router context. Phase 1 widens this to the full DI container
 * (`TContainer & { queryClient }`) built once in `app/container.ts`.
 */
export type TRouterContext = {
  queryClient: QueryClient;
};

const RootLayout: FC = () => <Outlet />;

export const Route = createRootRouteWithContext<TRouterContext>()({
  component: RootLayout,
});
