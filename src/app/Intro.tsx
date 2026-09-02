import {
  useEffect,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
} from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { AVATAR_IDS } from '@/shared/game';

/**
 * The Ninou Games boot flow (BRIEF Phase 1.b), ahead of the router:
 *   loading (downloads assets) → birthday "tap to hear the surprise"
 *   → music + "Bon anniversaire mon amour" → music ends → "tap to start" → app.
 */

const BASE = import.meta.env.BASE_URL;
const STEPS = 12;
const STEP_MS = 200; // ~2.4s minimum retro fill
const BIRTHDAY_MS = 9200; // mus.birthday runs ~9s; "tap to start" appears when it ends
const PRELOAD_TIMEOUT_MS = 6000;
const BIRTHDAY_VOLUME = 0.9; // louder for the surprise
const NORMAL_VOLUME = 0.55; // engine default, restored after the tune

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

const bigEmoji: CSSProperties = { fontSize: '72px', lineHeight: 1 };
const bigText: CSSProperties = {
  fontFamily: 'var(--cb-font-display)',
  fontSize: 'var(--cb-fs-title)',
  lineHeight: 1.7,
  margin: 0,
};
const bigGold: CSSProperties = { ...bigText, color: 'var(--cb-gold)' };

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

type TBirthdayStage = 'prompt' | 'reveal' | 'ready';

const BirthdayCard: FC<{
  stage: TBirthdayStage;
  message: string;
  surpriseHint: string;
  startHint: string;
  onActivate?: (() => void) | undefined;
}> = ({ stage, message, surpriseHint, startHint, onActivate }) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onActivate && (e.key === 'Enter' || e.key === ' ')) onActivate();
  };
  const interactive = Boolean(onActivate);
  return (
    <div
      style={{ ...fullScreen, cursor: interactive ? 'pointer' : 'default', textAlign: 'center' }}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div style={{ display: 'grid', gap: 'var(--cb-s5)', justifyItems: 'center' }}>
        {stage === 'prompt' ? (
          <>
            <span style={bigEmoji} aria-hidden="true">
              🎁
            </span>
            <p style={bigGold}>{surpriseHint}</p>
          </>
        ) : (
          <>
            <span style={bigEmoji} aria-hidden="true">
              🎂
            </span>
            <h1 style={{ ...bigText, color: 'var(--cb-cream)' }}>{message}</h1>
          </>
        )}

        {stage === 'ready' && (
          <p style={bigGold}>
            <span aria-hidden="true">➡️</span> {startHint}
          </p>
        )}
      </div>
    </div>
  );
};

export const Intro: FC<{ onDone: () => void }> = ({ onDone }) => {
  const t = useT();
  const sound = useSoundApi();
  const [stage, setStage] = useState<'loading' | TBirthdayStage>('loading');
  const [step, setStep] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);

  // Download assets during the loading view.
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
    if (stage !== 'loading') return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS)), STEP_MS);
    return () => clearInterval(id);
  }, [stage]);

  // Advance to the birthday once the bar is full AND assets are ready.
  useEffect(() => {
    if (stage === 'loading' && step >= STEPS && assetsReady) setStage('prompt');
  }, [stage, step, assetsReady]);

  // Surprise music has a finite length → reveal "tap to start" and drop the
  // volume back to normal when it ends.
  useEffect(() => {
    if (stage !== 'reveal') return;
    const id = setTimeout(() => {
      sound.setVolume(NORMAL_VOLUME);
      setStage('ready');
    }, BIRTHDAY_MS);
    return () => clearTimeout(id);
  }, [stage, sound]);

  const handleStartSurprise = () => {
    sound.unlock(); // first gesture — unlocks audio for the rest of the app
    sound.setVolume(BIRTHDAY_VOLUME); // crank it up for the surprise
    sound.play('mus.birthday');
    setStage('reveal');
  };

  if (stage === 'loading') {
    const progress = assetsReady ? step / STEPS : Math.min(step / STEPS, 0.9);
    return <StudioSplash progress={progress} label={t('splash.studio')} />;
  }

  return (
    <BirthdayCard
      stage={stage}
      message={t('splash.birthday')}
      surpriseHint={t('splash.surprise')}
      startHint={t('splash.start')}
      onActivate={stage === 'prompt' ? handleStartSurprise : stage === 'ready' ? onDone : undefined}
    />
  );
};
