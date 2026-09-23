import { useEffect, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang, type TStringKey } from '@/shared/i18n';
import { useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { useInstallPrompt } from '@/shared/pwa';
import { AVATAR_IDS } from '@/shared/game';
import { Screen, PixelPanel, PixelButton, ChipButton, Logo, TeamArt, teamsWithArt } from '@/shared/Chrome';

const IOS_HINT_KEY = 'cb-ios-hint-seen';

function readIosHintSeen(): boolean {
  try {
    return localStorage.getItem(IOS_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** A team that has character art, for the Home hero (first delivered = otters). */
function pickHeroTeam(): string | null {
  const withArt = teamsWithArt().filter((id) => (AVATAR_IDS as readonly string[]).includes(id));
  return withArt[Math.floor(Math.random() * withArt.length)] ?? null;
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

  const [hero] = useState(pickHeroTeam);

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
    <Screen>
      <div className="cb-topbar">
        <span />
        <ChipButton onClick={handleToggleLang} aria-label={t('settings.language')}>
          {lang.toUpperCase()}
        </ChipButton>
      </div>

      <div className="cb-grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        <Logo alt={t('app.name')} />
        <p className="cb-muted cb-center" style={{ margin: 0 }}>
          {t('app.tagline')}
        </p>
        {hero && (
          <TeamArt teamId={hero} label={t(`team.${hero}` as TStringKey)} variant="hero" className="cb-home-hero" />
        )}
      </div>

      {hasResume && (
        <PixelPanel className="cb-stack">
          <strong className="cb-h2">{t('common.resume.title')}</strong>
          <p style={{ margin: 0 }}>{t('common.resume.body')}</p>
          <PixelButton onClick={handleResume}>{t('common.resume.yes')}</PixelButton>
          <PixelButton variant="ghost" onClick={handleDiscard}>
            {t('common.resume.no')}
          </PixelButton>
        </PixelPanel>
      )}

      <PixelButton onClick={handlePlay}>{t('home.play')}</PixelButton>
      <PixelButton variant="ghost" onClick={handleHowto}>
        {t('home.howto')}
      </PixelButton>
      <PixelButton variant="ghost" onClick={handleSettings}>
        {t('home.settings')}
      </PixelButton>

      {showAndroidInstall && (
        <PixelPanel className="cb-stack">
          <PixelButton variant="secondary" onClick={handleInstall}>
            {t('home.install.android')}
          </PixelButton>
          <PixelButton variant="ghost" onClick={handleDismissInstall}>
            {t('home.install.dismiss')}
          </PixelButton>
        </PixelPanel>
      )}
      {showIosInstall && (
        <PixelPanel className="cb-stack">
          <p className="cb-muted" style={{ margin: 0 }}>
            {t('home.install.ios')}
          </p>
          <PixelButton variant="ghost" onClick={handleDismissInstall}>
            {t('home.install.dismiss')}
          </PixelButton>
        </PixelPanel>
      )}
    </Screen>
  );
};
