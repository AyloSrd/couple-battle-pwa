import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PlayerAvatar } from '@/shared/Chrome';

/** The two couples of the diagram: each sits one partner on side A (left), the other on side B (right). */
const COUPLES = [
  { n: 1, teamId: 'otters' },
  { n: 2, teamId: 'lions' },
] as const;

/**
 * "Every couple splits": side A and side B, two couples drawn with the game's own portraits, each
 * linked across. It is ONE spoken element (the alt text); its pieces are hidden from the screen reader.
 */
export const Seating: FC = () => {
  const t = useT();
  return (
    <div className="cb-howto-seating" role="img" aria-label={t('howto.principles.split.alt')}>
      <div className="cb-howto-seating-row cb-howto-seating-sides" aria-hidden="true">
        <span>{t('howto.side.a')}</span>
        <span />
        <span>{t('howto.side.b')}</span>
      </div>
      {COUPLES.map(({ n, teamId }) => (
        <div key={n} className="cb-howto-seating-row" aria-hidden="true">
          <PlayerAvatar teamId={teamId} slot={1} name="" teamLabel={teamId} />
          <span className="cb-howto-seating-link">{t('howto.couple', { n })}</span>
          <PlayerAvatar teamId={teamId} slot={2} name="" teamLabel={teamId} />
        </div>
      ))}
    </div>
  );
};
