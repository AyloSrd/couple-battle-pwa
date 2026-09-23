import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, PixelButton, Logo } from '@/shared/Chrome';

export const LegalView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();

  const handleBack = () => {
    sound.play('sfx.back');
    navigate({ to: '/settings' });
  };

  return (
    <Screen>
      <div className="cb-topbar">
        <PixelButton variant="ghost" block={false} onClick={handleBack}>
          ← {t('common.back')}
        </PixelButton>
      </div>
      <Logo alt={t('app.name')} small />
      <h1 className="cb-title">{t('legal.title')}</h1>
      <PixelPanel>
        <p style={{ margin: 0 }}>{t('legal.body')}</p>
      </PixelPanel>
    </Screen>
  );
};
