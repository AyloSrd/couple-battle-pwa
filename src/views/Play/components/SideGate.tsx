import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, Chip } from '@/shared/Chrome';
import '../flash.css';

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
    <div className="cb-v-flash cb-v-flash--sidegate">
      <div className="cb-flash-hero">
        <Chip className="cb-reveal-in">
          {isAnswerers ? t('flash.side.chip.answerers') : t('flash.side.chip.guessers')}
        </Chip>
        <h1 className="cb-title">{isAnswerers ? t('flash.side.answerers.title') : t('flash.side.guessers.title')}</h1>
        <p className="cb-flash-sub">{isAnswerers ? t('flash.side.answerers.sub') : t('flash.side.guessers.sub')}</p>
      </div>
      <PixelButton onClick={onConfirm}>{t('common.start')}</PixelButton>
    </div>
  );
};
