import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang } from '@/shared/i18n';
import { useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { Screen, PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';

export const HomeView: FC = () => {
  const t = useT();
  const { lang, setLang } = useLang();
  const sound = useSoundApi();
  const navigate = useNavigate();
  const { reset } = useDraftGame();
  const snapshotQuery = useGetSave('gameSnapshot');
  const putSnapshot = usePutSave('gameSnapshot');
  const hasResume = Boolean(snapshotQuery.data);

  const handleToggleLang = () => {
    sound.unlock();
    sound.play('sfx.tap');
    setLang(lang === 'fr' ? 'en' : 'fr');
  };

  const handlePlay = () => {
    sound.unlock();
    sound.play('sfx.select');
    reset();
    navigate({ to: '/setup' });
  };

  const handleHowto = () => {
    sound.play('sfx.tap');
    navigate({ to: '/how-to-play' });
  };

  const handleSettings = () => {
    sound.play('sfx.tap');
    navigate({ to: '/settings' });
  };

  const handleResume = () => {
    sound.unlock();
    sound.play('sfx.select');
    navigate({ to: '/play' });
  };

  const handleDiscard = () => {
    sound.play('sfx.back');
    putSnapshot.mutate(null);
  };

  return (
    <Screen center>
      <div style={{ position: 'absolute', top: 'var(--cb-s4)', right: 'var(--cb-s4)' }}>
        <PixelButton variant="ghost" onClick={handleToggleLang} aria-label="language">
          <Sprite name={lang === 'fr' ? 'ui-flag-fr' : 'ui-flag-en'} width={24} height={18} />
        </PixelButton>
      </div>

      <Sprite name="logo" width={240} height={80} alt={t('app.name')} />
      <p className="cb-muted" style={{ margin: 0 }}>
        {t('app.tagline')}
      </p>

      {hasResume && (
        <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s3)', width: '100%' }}>
          <strong className="cb-heading">{t('common.resume.title')}</strong>
          <p style={{ margin: 0 }}>{t('common.resume.body')}</p>
          <PixelButton variant="primary" block onClick={handleResume}>
            {t('common.resume.yes')}
          </PixelButton>
          <PixelButton variant="ghost" block onClick={handleDiscard}>
            {t('common.resume.no')}
          </PixelButton>
        </PixelPanel>
      )}

      <PixelButton variant="gold" block onClick={handlePlay} style={{ fontSize: 'var(--cb-fs-title)' }}>
        {t('home.play')}
      </PixelButton>
      <PixelButton variant="ghost" block onClick={handleHowto}>
        {t('home.howto')}
      </PixelButton>
      <PixelButton variant="ghost" block onClick={handleSettings}>
        {t('home.settings')}
      </PixelButton>
    </Screen>
  );
};
