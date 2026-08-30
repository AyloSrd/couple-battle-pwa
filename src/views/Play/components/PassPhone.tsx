import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, Sprite } from '@/shared/Chrome';

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
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        gap: 'var(--cb-s5)',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--cb-s4)', justifyItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Sprite name={`avatar-${avatarId}`} size={96} />
          <Sprite name="ui-eye-no" size={24} style={{ position: 'absolute', bottom: -4, right: -4 }} />
        </div>
        <h1 className="cb-title">
          {isSecret ? t('pass.secret.title', { name: name ?? '' }) : t('pass.back.title')}
        </h1>
        <p className="cb-muted" style={{ margin: 0 }}>
          {isSecret ? t('pass.secret.sub', { team: teamName ?? '' }) : t('pass.back.sub')}
        </p>
        <PixelButton variant="gold" block onClick={onConfirm} style={{ fontSize: 'var(--cb-fs-heading)' }}>
          {isSecret ? t('pass.secret.confirm', { name: name ?? '' }) : t('pass.back.confirm')}
        </PixelButton>
      </div>
    </div>
  );
};
