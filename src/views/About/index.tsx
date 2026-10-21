import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, BackButton } from '@/shared/Chrome';
import './view.css';

/** The app shows no version anywhere else (package.json is a 0.0.0 placeholder): a plain constant, bumped by hand. */
const APP_VERSION = '0.1.0';

const POSTER_URL = `${import.meta.env.BASE_URL}splash/ninou-poster.webp`;

export const AboutView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();

  const handleBack = () => {
    sound.play('sfx.back');
    navigate({ to: '/settings' });
  };

  return (
    <Screen className="cb-v-about">
      <div className="cb-topbar">
        <BackButton label={t('common.back')} onClick={handleBack} />
      </div>
      <h1 className="cb-title">{t('about.title')}</h1>

      <PixelPanel className="cb-v-card">
        <img
          className="cb-v-poster"
          src={POSTER_URL}
          width={496}
          height={864}
          alt={t('about.poster.alt')}
          draggable={false}
        />
        <div className="cb-v-meta">
          <p className="cb-v-name">{t('app.name')}</p>
          <p className="cb-v-credits">{t('about.credits')}</p>
          <span className="cb-chip">{t('about.version', { version: APP_VERSION })}</span>
        </div>
      </PixelPanel>
    </Screen>
  );
};
