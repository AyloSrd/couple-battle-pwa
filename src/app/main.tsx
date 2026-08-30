import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RouterProvider,
  createRouter,
  createHashHistory,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContainer } from './container';
import { routeTree } from '../routeTree.gen';
import type { TRouterContext } from '../routes/__root';
import '../styles/global.css';

// GitHub Pages has no SPA rewrites — hash history keeps every route reachable.
function createAppRouter(context: TRouterContext) {
  return createRouter({
    routeTree,
    history: createHashHistory(),
    context,
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

async function bootstrap() {
  const queryClient = new QueryClient();
  const container = await createContainer();
  const router = createAppRouter({ ...container, queryClient });

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found');

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
