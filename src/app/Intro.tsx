import { useEffect, useState, type CSSProperties, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { AVATAR_IDS } from '@/shared/game';

/**
 * The boot loader, ahead of the router. A short studio splash that preloads the
 * critical assets (so the first real screen doesn't flash), then hands off to
 * the app. Gated once per session by the caller.
 */

const BASE = import.meta.env.BASE_URL;
const STEPS = 12;
const STEP_MS = 200; // ~2.4s minimum retro fill
const PRELOAD_TIMEOUT_MS = 6000;

// Critical assets to have ready before revealing the app (the SW precaches the
// rest for offline; this just avoids first-paint flashes).
const SPRITE_NAMES = [
  'logo',
  'logo-icon',
  ...AVATAR_IDS.map((id) => `avatar-${id}`),
  'ui-heart', 'ui-crown', 'ui-skull', 'ui-spark', 'ui-lock', 'ui-eye-no', 'ui-gear', 'ui-pause',
  'ui-btn', 'ui-btn-pressed', 'ui-panel', 'ui-flag-fr', 'ui-flag-en', 'ui-toggle-on', 'ui-toggle-off',
  'ui-dot-empty', 'ui-dot-current', 'ui-dot-done',
  'ui-confetti-1', 'ui-confetti-2', 'ui-confetti-3', 'ui-confetti-4',
  'mode-flash', 'mode-dilemma',
  'diff-mix', 'diff-easy', 'diff-medium', 'diff-hard',
  'theme-home', 'theme-food', 'theme-travel', 'theme-work', 'theme-hobbies', 'theme-goingout',
  'theme-money', 'theme-childhood', 'theme-personality', 'theme-dreams', 'theme-intimacy', 'theme-random',
  'count-1', 'count-2', 'count-3', 'count-go', 'count-burst',
  'card-back', 'card-front', 'bg-hearts',
  'demo-phone', 'demo-bubble-think', 'demo-bubble-answer',
];

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // never block on a missing asset
    img.src = url;
  });
}

/** Fonts + critical images. Resolves when ready, or after a safety timeout. */
function preloadAssets(): Promise<void> {
  const urls = [
    `${BASE}splash/ninou-penguins.png`,
    ...SPRITE_NAMES.map((n) => `${BASE}sprites/${n}.svg`),
  ];
  const fonts = document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve();
  const assets = Promise.all([fonts, ...urls.map(preloadImage)]).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS));
  return Promise.race([assets, timeout]);
}

const fullScreen: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--cb-ink)',
  display: 'grid',
  placeItems: 'center',
  padding: 'var(--cb-s5)',
  boxSizing: 'border-box',
};

const StudioSplash: FC<{ progress: number; label: string }> = ({ progress, label }) => (
  <div style={fullScreen}>
    <div
      style={{ display: 'grid', gap: 'var(--cb-s6)', justifyItems: 'center', width: 'min(70vw, 460px)' }}
    >
      <img
        src={`${BASE}splash/ninou-penguins.png`}
        alt=""
        style={{ width: '100%', imageRendering: 'pixelated' }}
      />
      <div
        style={{
          fontFamily: 'var(--cb-font-display)',
          color: 'var(--cb-cream)',
          fontSize: 'var(--cb-fs-heading)',
          letterSpacing: '2px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: '80%',
          height: 18,
          background: 'var(--cb-white)',
          border: 'var(--cb-border)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--cb-gold)' }} />
      </div>
    </div>
  </div>
);

export const Intro: FC<{ onDone: () => void }> = ({ onDone }) => {
  const t = useT();
  const [step, setStep] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);

  // Download critical assets during the splash.
  useEffect(() => {
    let cancelled = false;
    void preloadAssets().then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stepped retro loading bar.
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS)), STEP_MS);
    return () => clearInterval(id);
  }, []);

  // Bar full AND assets ready → into the app.
  useEffect(() => {
    if (step >= STEPS && assetsReady) onDone();
  }, [step, assetsReady, onDone]);

  const progress = assetsReady ? step / STEPS : Math.min(step / STEPS, 0.9);
  return <StudioSplash progress={progress} label={t('splash.studio')} />;
};
