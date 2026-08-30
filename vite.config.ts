/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Project page: https://aylosrd.github.io/couple-battle-pwa/
const BASE = '/couple-battle-pwa/';

export default defineConfig({
  base: BASE,
  plugins: [
    // Must run before the React plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache everything — the game must be 100% playable offline after first load.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
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
        background_color: '#fff1d6',
        theme_color: '#1a1c2c',
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
  },
});
