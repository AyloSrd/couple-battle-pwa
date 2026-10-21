import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, Logo, BackButton } from '@/shared/Chrome';
import './view.css';

export const LegalView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();

  const handleBack = () => {
    sound.play('sfx.back');
    navigate({ to: '/settings' });
  };

  return (
    <Screen className="cb-v-legal">
      <div className="cb-topbar">
        <BackButton label={t('common.back')} onClick={handleBack} />
      </div>
      <Logo alt={t('app.name')} small />
      <h1 className="cb-title">{t('legal.title')}</h1>
      <PixelPanel className="cb-v-body">
        <p className="cb-body-lg">{t('legal.body')}</p>
      </PixelPanel>
    </Screen>
  );
};
