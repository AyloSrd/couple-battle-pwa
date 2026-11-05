import './zodConfig';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import { boot, type TBooted } from './boot';
import { renderCrashScreen } from './crash';
import { CrashScreen } from './CrashScreen';
import { SplashGate } from './SplashGate';
import { routeTree } from '../routeTree.gen';
import '@/shared/pwa/installPrompt'; // beforeinstallprompt can fire before Home mounts
import '@/shared/pwa/swUpdate'; // reload open tabs when a new deploy's service worker takes over
import '../styles/global.css';
// Render-blocking here, else only the lazy route chunks pull it in (an unstyled first frame).
import '@/shared/Chrome/chrome.css';

// GitHub Pages has no SPA rewrites: hash history. The context (the booted app) feeds the guards.
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

/** Boot, then render. A throw before React renders gets the provider-free crash screen, not a blank page. */
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
