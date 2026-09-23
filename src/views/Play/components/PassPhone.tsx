import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, TeamArt } from '@/shared/Chrome';

type TProps = {
  variant: 'secret' | 'back';
  avatarId: string;
  /** Answerer's name (secret variant). */
  name?: string;
  /** Team name (secret variant). */
  teamName?: string;
  onConfirm: () => void;
};

/** V-PassPhone — privacy gate before/after secret input. */
export const PassPhone: FC<TProps> = ({ variant, avatarId, name, teamName, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();

  useEffect(() => {
    sound.play('sfx.pass');
  }, [sound]);

  const isSecret = variant === 'secret';

  return (
    <>
      <div className="cb-grow" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div className="cb-stack" style={{ justifyItems: 'center', gap: 'var(--cb-s4)' }}>
          <TeamArt teamId={avatarId} label={teamName ?? ''} variant="avatarLg" />
          <h1 className="cb-title">
            {isSecret ? t('pass.secret.title', { name: name ?? '' }) : t('pass.back.title')}
          </h1>
          <p className="cb-muted" style={{ margin: 0 }}>
            {isSecret ? t('pass.secret.sub', { team: teamName ?? '' }) : t('pass.back.sub')}
          </p>
        </div>
      </div>
      <PixelButton onClick={onConfirm}>
        {isSecret ? t('pass.secret.confirm', { name: name ?? '' }) : t('pass.back.confirm')}
      </PixelButton>
    </>
  );
};
