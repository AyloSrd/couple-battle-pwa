import { useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton } from '@/shared/Chrome';

type TPauseSheetProps = {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
};

/** Pause overlay (game dimmed behind). Quit asks for confirmation. */
export const PauseSheet: FC<TPauseSheetProps> = ({ onResume, onRestart, onQuit }) => {
  const t = useT();
  const [confirmQuit, setConfirmQuit] = useState(false);
  const handleAskQuit = () => setConfirmQuit(true);
  const handleCancelQuit = () => setConfirmQuit(false);

  return (
    <div className="cb-overlay" role="dialog" aria-modal="true" aria-label={t('pause.title')}>
      <PixelPanel className="cb-sheet">
        <h2 className="cb-h2 cb-center">{t('pause.title')}</h2>

        {confirmQuit ? (
          <>
            <p className="cb-body-lg">{t('pause.quit.confirm')}</p>
            <div className="cb-row-2">
              <PixelButton variant="secondary" onClick={handleCancelQuit}>
                {t('common.cancel')}
              </PixelButton>
              <PixelButton variant="negative" onClick={onQuit}>
                {t('common.confirm')}
              </PixelButton>
            </div>
          </>
        ) : (
          <>
            <PixelButton onClick={onResume}>{t('pause.resume')}</PixelButton>
            <PixelButton variant="secondary" onClick={onRestart}>
              {t('pause.restartRound')}
            </PixelButton>
            <PixelButton variant="ghost" onClick={handleAskQuit}>
              {t('pause.quit')}
            </PixelButton>
          </>
        )}
      </PixelPanel>
    </div>
  );
};
