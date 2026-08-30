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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,28,44,0.7)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--cb-s4)',
      }}
    >
      <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s3)', width: '100%', maxWidth: 340 }}>
        <h2 className="cb-title" style={{ textAlign: 'center' }}>
          {t('pause.title')}
        </h2>

        {confirmQuit ? (
          <>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{t('pause.quit.confirm')}</p>
            <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
              <PixelButton variant="ghost" block onClick={handleCancelQuit}>
                {t('common.cancel')}
              </PixelButton>
              <PixelButton variant="negative" block onClick={onQuit}>
                {t('common.confirm')}
              </PixelButton>
            </div>
          </>
        ) : (
          <>
            <PixelButton variant="primary" block onClick={onResume}>
              {t('pause.resume')}
            </PixelButton>
            <PixelButton variant="ghost" block onClick={onRestart}>
              {t('pause.restartRound')}
            </PixelButton>
            <PixelButton variant="negative" block onClick={handleAskQuit}>
              {t('pause.quit')}
            </PixelButton>
          </>
        )}
      </PixelPanel>
    </div>
  );
};
