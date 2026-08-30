import { useEffect, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang } from '@/shared/i18n';
import { useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { useInstallPrompt } from '@/shared/pwa';
import { AVATAR_IDS } from '@/shared/game';
import { Screen, PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';

const IOS_HINT_KEY = 'cb-ios-hint-seen';

function readIosHintSeen(): boolean {
  try {
    return localStorage.getItem(IOS_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export const HomeView: FC = () => {
  const t = useT();
  const { lang, setLang } = useLang();
  const sound = useSoundApi();
  const navigate = useNavigate();
  const { reset } = useDraftGame();
  const snapshotQuery = useGetSave('gameSnapshot');
  const settingsQuery = useGetSave('settings');
  const putSnapshot = usePutSave('gameSnapshot');
  const hasResume = Boolean(snapshotQuery.data);

  const { platform, promptInstall } = useInstallPrompt();
  const [installDismissed, setInstallDismissed] = useState(false);
  const [iosHintSeen] = useState(readIosHintSeen);
  const showAndroidInstall = platform === 'android' && !installDismissed;
  const showIosInstall = platform === 'ios' && !installDismissed && !iosHintSeen;

  // Two random avatars peeking from the bottom corners (pure charm).
  const [peek] = useState<[string, string]>(() => {
    const shuffled = [...AVATAR_IDS].sort(() => Math.random() - 0.5);
    return [shuffled[0] ?? 'penguins', shuffled[1] ?? 'otters'];
  });

  // Menu music while on Home (only once audio is on); stops when leaving.
  const soundOn = settingsQuery.data?.sound ?? false;
  useEffect(() => {
    if (soundOn) sound.music('mus.menu');
    return () => sound.music(null);
  }, [sound, soundOn]);

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
  const handleInstall = () => {
    sound.play('sfx.tap');
    void promptInstall();
  };
  const handleDismissInstall = () => {
    sound.play('sfx.back');
    setInstallDismissed(true);
    if (platform === 'ios') {
      try {
        localStorage.setItem(IOS_HINT_KEY, '1');
      } catch {
        // storage unavailable — hint just reappears next visit.
      }
    }
  };

  return (
    <>
      <div className="cb-bg-hearts" aria-hidden="true" />
      <Sprite className="cb-peek cb-peek--left" name={`avatar-${peek[0]}`} size={40} />
      <Sprite className="cb-peek cb-peek--right" name={`avatar-${peek[1]}`} size={40} />

      <Screen center>
        <div style={{ position: 'absolute', top: 'var(--cb-s4)', right: 'var(--cb-s4)' }}>
          <PixelButton variant="ghost" onClick={handleToggleLang} aria-label="language">
            <Sprite name={lang === 'fr' ? 'ui-flag-fr' : 'ui-flag-en'} width={24} height={18} />
          </PixelButton>
        </div>

        <Sprite className="cb-anim-bounce" name="logo" width={240} height={80} alt={t('app.name')} />
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

        {showAndroidInstall && (
          <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s2)', width: '100%' }}>
            <PixelButton variant="primary" block onClick={handleInstall}>
              {t('home.install.android')}
            </PixelButton>
            <PixelButton variant="ghost" block onClick={handleDismissInstall}>
              {t('home.install.dismiss')}
            </PixelButton>
          </PixelPanel>
        )}
        {showIosInstall && (
          <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s2)', width: '100%' }}>
            <p style={{ margin: 0, fontSize: 'var(--cb-fs-small)' }}>{t('home.install.ios')}</p>
            <PixelButton variant="ghost" block onClick={handleDismissInstall}>
              {t('home.install.dismiss')}
            </PixelButton>
          </PixelPanel>
        )}
      </Screen>
    </>
  );
};
