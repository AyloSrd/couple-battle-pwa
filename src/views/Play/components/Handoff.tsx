import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, TeamArt } from '@/shared/Chrome';

type TProps = {
  avatarId: string;
  /** Localized team name (placeholder initial when no art). */
  teamName: string;
  /** The next answerer's first name. */
  name: string;
  onConfirm: () => void;
};

/**
 * LIGHT handoff between answerers within the collection phase. The questions
 * are shared inside the answerers' group, so this is just "your turn, pass it
 * over" — deliberately NOT the strict no-peek pass-phone gate.
 */
export const Handoff: FC<TProps> = ({ avatarId, teamName, name, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();

  useEffect(() => {
    sound.play('sfx.whoosh');
  }, [sound]);

  return (
    <>
      <div className="cb-grow" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div className="cb-stack" style={{ justifyItems: 'center', gap: 'var(--cb-s4)' }}>
          <TeamArt teamId={avatarId} label={teamName} variant="avatarLg" />
          <h2 className="cb-h2">{t('flash.side.next', { name })}</h2>
        </div>
      </div>
      <PixelButton onClick={onConfirm}>{t('pass.secret.confirm', { name })}</PixelButton>
    </>
  );
};
