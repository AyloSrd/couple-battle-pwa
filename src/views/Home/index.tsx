import { useEffect, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang } from '@/shared/i18n';
import { useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { useInstallPrompt } from '@/shared/pwa';
import { Screen, PixelPanel, PixelButton, ChipButton, Logo } from '@/shared/Chrome';
import chars600 from '@/assets/art/chars-home-600.webp';
import chars900 from '@/assets/art/chars-home-900.webp';
import './view.css';

const IOS_HINT_KEY = 'cb-ios-hint-seen';

function readIosHintSeen(): boolean {
  try {
    return localStorage.getItem(IOS_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Settings gear — inline so Home needs no extra image file. Decorative: the button carries the label. */
const GearIcon: FC = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

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
    <Screen className="cb-v-home">
      <div className="cb-topbar">
        <span />
        <ChipButton onClick={handleToggleLang} aria-label={t('settings.language')}>
          {lang.toUpperCase()}
        </ChipButton>
      </div>

      <Logo alt={t('app.name')} className="cb-v-home-logo" />

      <div className="cb-v-home-stage">
        <img
          className="cb-v-home-chars"
          src={chars600}
          srcSet={`${chars600} 600w, ${chars900} 900w`}
          sizes="(min-width: 480px) 480px, 100vw"
          width={600}
          height={400}
          alt=""
          draggable={false}
        />
      </div>

      {hasResume && (
        <PixelPanel className="cb-stack cb-v-home-panel">
          <strong className="cb-h2">{t('common.resume.title')}</strong>
          <p>{t('common.resume.body')}</p>
          <PixelButton onClick={handleResume}>{t('common.resume.yes')}</PixelButton>
          <PixelButton variant="ghost" onClick={handleDiscard}>
            {t('common.resume.no')}
          </PixelButton>
        </PixelPanel>
      )}

      <PixelButton className="cb-v-home-play" onClick={handlePlay}>
        {t('home.play')}
      </PixelButton>

      <div className="cb-v-home-links">
        <button type="button" className="cb-v-home-howto" onClick={handleHowto}>
          <span className="cb-v-home-round" aria-hidden="true">
            ?
          </span>
          <span className="cb-v-home-howto-label">{t('home.howto')}</span>
        </button>
        <span className="cb-v-home-divider" aria-hidden="true" />
        <button type="button" className="cb-v-home-round" aria-label={t('home.settings')} onClick={handleSettings}>
          <GearIcon />
        </button>
      </div>

      {showAndroidInstall && (
        <PixelPanel className="cb-stack cb-v-home-panel">
          <PixelButton variant="secondary" onClick={handleInstall}>
            {t('home.install.android')}
          </PixelButton>
          <PixelButton variant="ghost" onClick={handleDismissInstall}>
            {t('home.install.dismiss')}
          </PixelButton>
        </PixelPanel>
      )}
      {showIosInstall && (
        <PixelPanel className="cb-stack cb-v-home-panel">
          <p className="cb-muted">{t('home.install.ios')}</p>
          <PixelButton variant="ghost" onClick={handleDismissInstall}>
            {t('home.install.dismiss')}
          </PixelButton>
        </PixelPanel>
      )}
    </Screen>
  );
};
