import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, Sprite } from '@/shared/Chrome';

type TProps = {
  avatarId: string;
  /** The next answerer's first name. */
  name: string;
  onConfirm: () => void;
};

/**
 * LIGHT handoff between answerers within the collection phase. The questions
 * are shared inside the answerers' group, so this is just "your turn, pass it
 * over" — deliberately NOT the strict no-peek pass-phone gate.
 */
export const Handoff: FC<TProps> = ({ avatarId, name, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();

  useEffect(() => {
    sound.play('sfx.whoosh');
  }, [sound]);

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        gap: 'var(--cb-s4)',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--cb-s4)', justifyItems: 'center' }}>
        <Sprite name={`avatar-${avatarId}`} size={72} />
        <h2 className="cb-heading" style={{ margin: 0 }}>
          {t('flash.side.next', { name })}
        </h2>
        <PixelButton variant="gold" block onClick={onConfirm} style={{ fontSize: 'var(--cb-fs-heading)' }}>
          {t('pass.secret.confirm', { name })}
        </PixelButton>
      </div>
    </div>
  );
};
