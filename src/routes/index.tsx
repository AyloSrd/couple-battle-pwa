import { createFileRoute } from '@tanstack/react-router';
import type { FC } from 'react';

/**
 * Phase 0 placeholder home. It exists so the empty app builds, deploys, and
 * proves the toolchain end-to-end (tokens, fonts, sprites, PWA). Phase 1
 * replaces it with the real V-Home view slice.
 */
const Home: FC = () => (
  <main
    style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      gap: 'var(--cb-s5)',
      padding: 'var(--cb-s5)',
      textAlign: 'center',
    }}
  >
    <div style={{ display: 'grid', gap: 'var(--cb-s4)', justifyItems: 'center' }}>
      <img
        src={`${import.meta.env.BASE_URL}sprites/logo.svg`}
        alt="Couple Battle"
        width={192}
        height={64}
        style={{ imageRendering: 'pixelated' }}
      />
      <h1
        style={{
          fontFamily: 'var(--cb-font-display)',
          fontSize: 'var(--cb-fs-title)',
          margin: 0,
          color: 'var(--cb-text)',
        }}
      >
        Couple Battle
      </h1>
      <p
        style={{
          fontFamily: 'var(--cb-font-body)',
          fontSize: 'var(--cb-fs-small)',
          color: 'var(--cb-text-muted)',
          margin: 0,
        }}
      >
        Phase 0 — toolchain ready.
      </p>
    </div>
  </main>
);

export const Route = createFileRoute('/')({
  component: Home,
});
