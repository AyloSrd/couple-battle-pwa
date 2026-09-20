import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, Sprite } from '@/shared/Chrome';

type TProps = {
  /** Which group takes the phone: answerers (collect) or guessers (guess). */
  side: 'answerers' | 'guessers';
  onConfirm: () => void;
};

/**
 * Full-screen GROUP gate at a Flash phase boundary ("sofa sides"). The privacy
 * boundary is between the two groups, not between individuals: answerers may
 * consult among themselves, guessers must not see the phone during collection.
 * (Solo games use the strict V-PassPhone instead — there is no group.)
 */
export const SideGate: FC<TProps> = ({ side, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();

  useEffect(() => {
    sound.play('sfx.pass');
  }, [sound]);

  const isAnswerers = side === 'answerers';

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
          <span style={{ fontSize: '72px', lineHeight: 1 }} aria-hidden="true">
            🛋️
          </span>
          {isAnswerers && (
            <Sprite name="ui-eye-no" size={24} style={{ position: 'absolute', bottom: -4, right: -4 }} />
          )}
        </div>
        <h1 className="cb-title">
          {isAnswerers ? t('flash.side.answerers.title') : t('flash.side.guessers.title')}
        </h1>
        <p className="cb-muted" style={{ margin: 0 }}>
          {isAnswerers ? t('flash.side.answerers.sub') : t('flash.side.guessers.sub')}
        </p>
        <PixelButton variant="gold" block onClick={onConfirm} style={{ fontSize: 'var(--cb-fs-heading)' }}>
          {t('common.start')}
        </PixelButton>
      </div>
    </div>
  );
};
