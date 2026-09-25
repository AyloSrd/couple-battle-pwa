import { useEffect, useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { AVATAR_IDS } from '@/shared/game';
import { Screen, teamArtUrl } from '@/shared/Chrome';
import logo480 from '@/assets/art/logo-480.webp';
import logo960 from '@/assets/art/logo-960.webp';
import modeFlash from '@/assets/art/mode-flash-256.webp';
import modeDilemma from '@/assets/art/mode-dilemma-256.webp';
import modeUltime from '@/assets/art/mode-ultime-256.webp';

/**
 * The boot loader, ahead of the router. The Ninou Games studio splash on the
 * sunburst (burst) background: preloads the critical assets (fonts, logo, mode icons, team
 * art) so the first real screen doesn't flash, then hands off to the app.
 * Gated once per session by the caller.
 */

const BASE = import.meta.env.BASE_URL;
const STEPS = 12;
const STEP_MS = 200; // ~2.4s minimum fill
const PRELOAD_TIMEOUT_MS = 6000;

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
  const teamArt = AVATAR_IDS.flatMap((id) => [teamArtUrl(id, 512), teamArtUrl(id, 768)]).filter(
    (u): u is string => Boolean(u),
  );
  const urls = [
    `${BASE}splash/ninou-penguins.png`,
    logo480,
    logo960,
    modeFlash,
    modeDilemma,
    modeUltime,
    ...Array.from(new Set(teamArt)),
  ];
  const fonts = document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve();
  const assets = Promise.all([fonts, ...urls.map(preloadImage)]).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS));
  return Promise.race([assets, timeout]);
}

const StudioSplash: FC<{ progress: number; label: string }> = ({ progress, label }) => (
  <Screen burst center style={{ position: 'fixed', inset: 0, maxWidth: 'none' }}>
    <div className="cb-glow" aria-hidden="true" />
    <div className="cb-stack" style={{ justifyItems: 'center', gap: 'var(--cb-s6)', width: 'min(70vw, 460px)' }}>
      {/* The studio's own identity — kept as-is, now on the sunburst. */}
      <img src={`${BASE}splash/ninou-penguins.png`} alt="" style={{ width: '100%' }} draggable={false} />
      <div className="cb-label" style={{ color: 'var(--cb-text)', letterSpacing: 'var(--cb-tracking-overline)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        style={{
          width: '80%',
          height: 10,
          borderRadius: 'var(--cb-r-pill)',
          background: 'var(--cb-surface)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 'var(--cb-r-pill)',
            background: 'var(--cb-action)',
            transition: 'width var(--cb-t-screen) var(--cb-ease-out)',
          }}
        />
      </div>
    </div>
  </Screen>
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

  // Stepped loading bar.
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
