import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton } from '@/shared/Chrome';

type TProps = {
  /** 1-based number of the NEXT couple (they have no avatar yet). */
  nextCoupleNumber: number;
  onConfirm: () => void;
};

/**
 * Step C — PASS-PHONE interstitial, shown only BETWEEN couples. Reuses the
 * pass-phone pattern (big central area, pass sfx) but shows the next couple's
 * number since they haven't picked a team yet.
 */
export const SetupPass: FC<TProps> = ({ nextCoupleNumber, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();

  useEffect(() => {
    sound.play('sfx.pass');
  }, [sound]);

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
        <span className="cb-anim-bounce" style={{ fontSize: '64px', lineHeight: 1 }} aria-hidden="true">
          📱
        </span>
        <span className="cb-heading" style={{ fontSize: 'var(--cb-fs-heading)' }}>
          {/* "Duo {n}" — reuse the localized team-pick line, kept up to the colon
              ("Duo 2 : choisissez…" / "Duo 2: pick…"), falling back to the whole
              line if a locale carries no colon. */}
          {(() => {
            const full = t('setup.team.pick', { n: nextCoupleNumber });
            const head = full.split(':')[0]?.trim();
            return head && head !== full ? head : full;
          })()}
        </span>
        <h1 className="cb-title">{t('setup.pass.title')}</h1>
        <PixelButton variant="gold" block onClick={onConfirm} style={{ fontSize: 'var(--cb-fs-heading)' }}>
          {t('setup.pass.confirm')}
        </PixelButton>
      </div>
    </div>
  );
};
