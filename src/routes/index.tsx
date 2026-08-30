import { createFileRoute } from '@tanstack/react-router';
import type { FC } from 'react';
import { useT, useLang } from '@/shared/i18n';
import { useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, PixelPanel, Sprite, ProgressDots } from '@/shared/Chrome';

/**
 * PHASE 1 BACKBONE PLACEHOLDER — not the real V-Home. It exists to make the
 * whole backbone visible and testable at the checkpoint: i18n (instant FR/EN
 * switch), Chrome components, the sound port, and settings persistence. The
 * walking skeleton replaces this with `views/Home`.
 */
const BackboneDemo: FC = () => {
  const t = useT();
  const { lang, setLang } = useLang();
  const soundApi = useSoundApi();
  const settingsQuery = useGetSave('settings');
  const putSettings = usePutSave('settings');
  const settings = settingsQuery.data;

  const handleFr = () => {
    soundApi.play('sfx.tap');
    setLang('fr');
  };
  const handleEn = () => {
    soundApi.play('sfx.tap');
    setLang('en');
  };
  const handleTap = () => soundApi.play('sfx.select');
  const handleToggleSound = () => {
    if (!settings) return;
    const next = !settings.sound;
    soundApi.play(next ? 'sfx.toggle.on' : 'sfx.toggle.off');
    putSettings.mutate({ ...settings, sound: next });
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--cb-s5)',
      }}
    >
      <PixelPanel
        style={{
          display: 'grid',
          gap: 'var(--cb-s4)',
          justifyItems: 'center',
          textAlign: 'center',
          maxWidth: 340,
        }}
      >
        <Sprite name="logo" width={192} height={64} alt={t('app.name')} />
        <h1
          style={{
            fontFamily: 'var(--cb-font-display)',
            fontSize: 'var(--cb-fs-title)',
            margin: 0,
          }}
        >
          {t('app.name')}
        </h1>
        <p style={{ margin: 0, color: 'var(--cb-text-muted)' }}>{t('app.tagline')}</p>

        <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
          <PixelButton variant={lang === 'fr' ? 'primary' : 'ghost'} onClick={handleFr}>
            FR
          </PixelButton>
          <PixelButton variant={lang === 'en' ? 'primary' : 'ghost'} onClick={handleEn}>
            EN
          </PixelButton>
        </div>

        <PixelButton variant="gold" block onClick={handleTap}>
          {t('common.start')}
        </PixelButton>

        <PixelButton variant="ghost" block onClick={handleToggleSound}>
          {t('settings.sound')} :{' '}
          {settings?.sound ? t('settings.sound.on') : t('settings.sound.off')}
        </PixelButton>

        <ProgressDots total={5} current={2} />

        <small style={{ color: 'var(--cb-text-muted)' }}>Phase 1 — backbone</small>
      </PixelPanel>
    </main>
  );
};

export const Route = createFileRoute('/')({
  component: BackboneDemo,
});
