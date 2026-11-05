import { useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelButton, Sheet } from '@/shared/Chrome';

type TPauseSheetProps = {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
};

/** Pause overlay; Quit asks first. Restart, quit and cancel are silent (as they always were). */
export const PauseSheet: FC<TPauseSheetProps> = ({ onResume, onRestart, onQuit }) => {
  const t = useT();
  const [confirmQuit, setConfirmQuit] = useState(false);
  const handleAskQuit = () => setConfirmQuit(true);
  const handleCancelQuit = () => setConfirmQuit(false);

  return (
    <Sheet label={t('pause.title')} title={t('pause.title')}>
      {confirmQuit ? (
        <>
          <p className="cb-dialog__text">{t('pause.quit.confirm')}</p>
          <div className="cb-row-2">
            <PixelButton variant="secondary" sfx={null} onClick={handleCancelQuit}>
              {t('common.cancel')}
            </PixelButton>
            <PixelButton variant="negative" sfx="sfx.back" onClick={onQuit}>
              {t('common.confirm')}
            </PixelButton>
          </div>
        </>
      ) : (
        <>
          <PixelButton onClick={onResume}>{t('pause.resume')}</PixelButton>
          <PixelButton variant="secondary" sfx={null} onClick={onRestart}>
            {t('pause.restartRound')}
          </PixelButton>
          <PixelButton variant="ghost" sfx={null} onClick={handleAskQuit}>
            {t('pause.quit')}
          </PixelButton>
        </>
      )}
    </Sheet>
  );
};
