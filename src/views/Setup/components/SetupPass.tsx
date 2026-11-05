import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelButton } from '@/shared/Chrome';
import { duoLabel } from '../domain/labels';

type TProps = {
  /** 1-based number of the NEXT couple (they have no avatar yet). */
  nextCoupleNumber: number;
  onConfirm: () => void;
};

/** Step C — PASS-PHONE, only BETWEEN couples: the next couple's number is the hero (no team yet). */
export const SetupPass: FC<TProps> = ({ nextCoupleNumber, onConfirm }) => {
  const t = useT();
  const sound = useSound();

  useEffect(() => {
    sound.play('sfx.pass');
  }, [sound]);

  return (
    <>
      <div className="cb-glow" aria-hidden="true" />
      <div className="cb-v-setup__pass">
        <span className="cb-label cb-v-setup__pass-label">{duoLabel(t('setup.team.pick', { n: nextCoupleNumber }))}</span>
        <span className="cb-numeral" aria-hidden="true">{nextCoupleNumber}</span>
        <h1 className="cb-title">{t('setup.pass.title')}</h1>
      </div>
      <PixelButton onClick={onConfirm}>{t('setup.pass.confirm')}</PixelButton>
    </>
  );
};
