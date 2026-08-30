import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, PixelButton } from '@/shared/Chrome';

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
      <PixelButton variant="ghost" onClick={handleBack}>
        ← {t('common.back')}
      </PixelButton>
      <h1 className="cb-title">{t('legal.title')}</h1>
      <PixelPanel>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{t('legal.body')}</p>
      </PixelPanel>
    </Screen>
  );
};
