import { useEffect, useState, type FC, type KeyboardEvent } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Sprite } from '@/shared/Chrome';

/**
 * The Ninou Games intro — the gift wrapping, shown on every cold start before
 * Home (BRIEF Phase 1.b). Screen 1: studio splash with a stepped loading bar
 * (silent). Screen 2: the birthday card; a tap unlocks audio and enters the app.
 */

const STEPS = 12;
const STEP_MS = 230; // ~2.75s total, retro stepped fill

const fullScreen = {
  position: 'fixed',
  inset: 0,
  background: 'var(--cb-ink)',
  display: 'grid',
  placeItems: 'center',
  padding: 'var(--cb-s5)',
  boxSizing: 'border-box',
} as const;

const StudioSplash: FC<{ step: number; label: string }> = ({ step, label }) => (
  <div style={fullScreen}>
    <div
      style={{
        display: 'grid',
        gap: 'var(--cb-s6)',
        justifyItems: 'center',
        width: 'min(70vw, 460px)',
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}splash/ninou-penguins.png`}
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
        <div
          style={{
            width: `${(step / STEPS) * 100}%`,
            height: '100%',
            background: 'var(--cb-gold)',
          }}
        />
      </div>
    </div>
  </div>
);

const BirthdayCard: FC<{ title: string; hint: string; onTap: () => void }> = ({
  title,
  hint,
  onTap,
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') onTap();
  };
  return (
    <div
      style={{ ...fullScreen, cursor: 'pointer', textAlign: 'center' }}
      onClick={onTap}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div style={{ display: 'grid', gap: 'var(--cb-s5)', justifyItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
          <Sprite name="ui-heart" size={20} />
          <Sprite name="ui-heart" size={28} />
          <Sprite name="ui-heart" size={20} />
        </div>
        <h1
          style={{
            fontFamily: 'var(--cb-font-display)',
            color: 'var(--cb-cream)',
            fontSize: 'var(--cb-fs-title)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p style={{ color: 'var(--cb-gold)', fontSize: 'var(--cb-fs-small)', margin: 0 }}>
          {hint}
        </p>
      </div>
    </div>
  );
};

export const Intro: FC<{ onDone: () => void }> = ({ onDone }) => {
  const t = useT();
  const sound = useSoundApi();
  const [phase, setPhase] = useState<'studio' | 'birthday'>('studio');
  const [step, setStep] = useState(0);

  // Stepped loading bar (studio screen only).
  useEffect(() => {
    if (phase !== 'studio') return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS)), STEP_MS);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (step >= STEPS) setPhase('birthday');
  }, [step]);

  const handleTap = () => {
    sound.unlock(); // first user gesture — unlock audio for the rest of the app
    sound.play('mus.fanfare'); // the birthday payoff (audio is now unlocked)
    onDone();
  };

  if (phase === 'studio') return <StudioSplash step={step} label={t('splash.studio')} />;
  return <BirthdayCard title={t('splash.birthday')} hint={t('splash.tap')} onTap={handleTap} />;
};
