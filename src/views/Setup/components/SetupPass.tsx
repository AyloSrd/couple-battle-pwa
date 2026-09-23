import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton } from '@/shared/Chrome';

type TProps = {
  /** 1-based number of the NEXT couple (they have no avatar yet). */
  nextCoupleNumber: number;
  onConfirm: () => void;
};

/** "Duo {n}" — the localized team-pick line up to its colon. */
function duoLabel(full: string): string {
  const head = full.split(':')[0]?.trim();
  return head && head !== full ? head : full;
}

/**
 * Step C — PASS-PHONE interstitial, shown only BETWEEN couples: the next
 * couple's number as the hero, since they haven't picked a team yet.
 */
export const SetupPass: FC<TProps> = ({ nextCoupleNumber, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();

  useEffect(() => {
    sound.play('sfx.pass');
  }, [sound]);

  return (
    <>
      <div className="cb-grow" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div className="cb-stack" style={{ justifyItems: 'center', gap: 'var(--cb-s4)' }}>
          <div className="cb-char-placeholder" aria-hidden="true" style={{ fontSize: 'var(--cb-fs-display-xl)', width: 'min(50%, 200px)' }}>
            {nextCoupleNumber}
          </div>
          <span className="cb-label" style={{ color: 'var(--cb-text-muted)' }}>
            {duoLabel(t('setup.team.pick', { n: nextCoupleNumber }))}
          </span>
          <h1 className="cb-title">{t('setup.pass.title')}</h1>
        </div>
      </div>
      <PixelButton onClick={onConfirm}>{t('setup.pass.confirm')}</PixelButton>
    </>
  );
};
