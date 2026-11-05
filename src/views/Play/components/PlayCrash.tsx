import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSaveStore } from '@/shared/save';
import { PixelButton, Screen } from '@/shared/Chrome';

/**
 * `/play`'s error screen. Retry remounts Play, which resumes from the last write; Quit game
 * throws the game away, so a step that keeps crashing can never trap the players.
 */
export const PlayCrash: FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const t = useT();
  const store = useSaveStore();
  const navigate = useNavigate();

  const handleQuit = () => {
    store.quitGame();
    navigate({ to: '/', replace: true });
  };

  return (
    <Screen className="cb-crash">
      <h1 className="cb-title">{t('crash.title')}</h1>
      <p>{t('crash.play.body')}</p>
      <PixelButton onClick={onRetry}>{t('crash.retry')}</PixelButton>
      <PixelButton variant="ghost" onClick={handleQuit}>
        {t('pause.quit')}
      </PixelButton>
    </Screen>
  );
};
