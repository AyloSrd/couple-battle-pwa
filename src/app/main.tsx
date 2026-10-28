import './zodConfig';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RouterProvider,
  createRouter,
  createHashHistory,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SAVE_DEFAULTS } from '@/shared/save';
import { createContainer } from './container';
import { Boot } from './Boot';
import { bootHash } from './bootRoute';
import { routeTree } from '../routeTree.gen';
import type { TRouterContext } from '../routes/__root';
// Register the beforeinstallprompt listener at boot — it can fire before Home
// mounts, so it must be captured here or it's missed.
import '@/shared/pwa/installPrompt';
// Auto-reload open tabs when a new deploy's service worker takes over (kills
// stale-version tabs). Guarded so it never fires on the first visit.
import '@/shared/pwa/swUpdate';
import '../styles/global.css';
// The component stylesheet is otherwise only pulled in by the lazy route chunks:
// importing it here keeps it render-blocking in index.html, so a cold first load
// never paints an unstyled (or blank) frame while the first route loads.
import '@/shared/Chrome/chrome.css';

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
  // Before the router reads the URL: a reload mid new-game flow lands on Home.
  const homeHash = bootHash(window.location.hash);
  if (homeHash) window.history.replaceState(window.history.state, '', homeHash);

  const queryClient = new QueryClient();
  const container = await createContainer();
  // Seed the splash's language from persisted settings (FR fallback baked in).
  const settings = await container.saveApi.get('settings').catch(() => SAVE_DEFAULTS.settings);
  const router = createAppRouter({ ...container, queryClient });

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found');

  // Sound, language and the save/questions ports are provided by the root route
  // (src/routes/__root.tsx). The only thing rendered outside the router is the boot
  // splash, which never blocks: the router mounts the moment it ends or fails.
  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Boot lang={settings.lang}>
          <RouterProvider router={router} />
        </Boot>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
