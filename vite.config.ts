import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Project page: https://aylosrd.github.io/couple-battle-pwa/
const BASE = '/couple-battle-pwa/';

// Strict CSP, production build only: Vite dev injects CSS as inline <style>, so a static meta in
// index.html would unstyle `pnpm dev`. No 'unsafe-eval' (Zod runs jitless, see src/app/zodConfig.ts),
// no 'unsafe-inline', no upgrade-insecure-requests (breaks `pnpm preview --host` over LAN http).
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-src 'none'",
].join('; ');

const CHARSET_META = '<meta charset="UTF-8" />';

function cspMeta(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      if (!html.includes(CHARSET_META)) {
        throw new Error(`csp-meta: "${CHARSET_META}" not found in index.html — CSP not injected`);
      }
      return html.replace(
        CHARSET_META,
        `${CHARSET_META}
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />
    <meta name="referrer" content="no-referrer" />`,
      );
    },
  };
}

export default defineConfig({
  base: BASE,
  build: {
    rolldownOptions: {
      // Run chunks in import order: otherwise the shared chunk holding zod + every schema executes
      // before the entry, i.e. before zodConfig sets jitless, and the CSP logs an eval violation.
      output: { strictExecutionOrder: true },
    },
  },
  plugins: [
    cspMeta(),
    // Must run before the React plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache everything — the game must be 100% playable offline after first load.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2,json}'],
        // The splash video is NOT precached: iOS Safari only plays media answered with byte
        // ranges, which the precache route cannot do. It is cached at runtime instead (the
        // splash warms it with one full GET) and served with range support from that cache.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp4'),
            handler: 'CacheFirst',
            options: {
              // Replacing a clip? Give it a new file name: entries are keyed by URL.
              cacheName: 'cb-media',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              // Bounded: a stale or orphaned clip is evicted, never kept forever.
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        navigateFallback: `${BASE}index.html`,
      },
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Couple Battle',
        short_name: 'Couple Battle',
        description: "Qui de vous deux connaît mieux l'autre ?",
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#2A0B8F',
        theme_color: '#2A0B8F',
        icons: [
          { src: 'pwa-icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Agent worktrees live under .claude/ with their own node_modules — never run their tests here.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
