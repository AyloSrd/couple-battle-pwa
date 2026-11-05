import './zodConfig';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import { boot, type TBooted } from './boot';
import { renderCrashScreen } from './crash';
import { CrashScreen } from './CrashScreen';
import { SplashGate } from './SplashGate';
import { routeTree } from '../routeTree.gen';
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
// The router context is the booted app: route guards read the save store and the draft.
function createAppRouter(context: TBooted) {
  return createRouter({
    routeTree,
    history: createHashHistory(),
    context,
    defaultPreload: 'intent',
    defaultErrorComponent: CrashScreen,
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

/**
 * Boot (IDB import → load → store → recover), then render. Anything that throws before React
 * renders gets the provider-free crash screen instead of a blank page; saved data is untouched.
 */
async function bootstrap() {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found');
  try {
    const booted = await boot();
    const router = createAppRouter(booted);
    // The splash plays ahead of the router; its skip label uses the saved language.
    createRoot(rootEl).render(
      <StrictMode>
        <SplashGate lang={booted.store.get().profile.settings.lang}>
          <RouterProvider router={router} />
        </SplashGate>
      </StrictMode>,
    );
  } catch (error) {
    console.error('boot failed', error);
    renderCrashScreen(rootEl);
  }
}

void bootstrap();
