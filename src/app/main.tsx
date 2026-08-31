import { StrictMode, useState, type FC, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RouterProvider,
  createRouter,
  createHashHistory,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SoundApiProvider } from '@/shared/sound';
import { LangProvider } from '@/shared/i18n';
import { createContainer } from './container';
import { Intro } from './Intro';
import { routeTree } from '../routeTree.gen';
import type { TRouterContext } from '../routes/__root';
// Register the beforeinstallprompt listener at boot — it fires early (before the
// intro finishes and Home mounts), so it must be captured here or it's missed.
import '@/shared/pwa/installPrompt';
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

/**
 * The Ninou Games intro runs AHEAD of the router (BRIEF Phase 1.b) — it is the
 * app's boot flow, so it plays once on every cold start before any route mounts.
 */
const Boot: FC<PropsWithChildren> = ({ children }) => {
  const [done, setDone] = useState(false);
  const handleDone = () => setDone(true);
  if (!done) return <Intro onDone={handleDone} />;
  return <>{children}</>;
};

async function bootstrap() {
  const queryClient = new QueryClient();
  const container = await createContainer();
  // Seed the intro's language from persisted settings (FR fallback baked in).
  const settings = await container.saveApi.get('settings');
  const router = createAppRouter({ ...container, queryClient });

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found');

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SoundApiProvider api={container.soundApi}>
          <LangProvider initialLang={settings.lang}>
            <Boot>
              <RouterProvider router={router} />
            </Boot>
          </LangProvider>
        </SoundApiProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
