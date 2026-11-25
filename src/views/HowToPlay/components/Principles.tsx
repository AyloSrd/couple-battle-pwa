import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel } from '@/shared/Chrome';
import { PRINCIPLES } from '../domain/principles';
import { Seating } from './Seating';

/** The four principle cards, from the domain table. The split card holds the seating diagram. */
export const Principles: FC = () => {
  const t = useT();
  return (
    <>
      {PRINCIPLES.map(({ id, badge, title, body }) => (
        <PixelPanel key={id} className={badge ? 'cb-howto-card cb-howto-card--badge' : 'cb-howto-card'}>
          {badge && (
            <span className="cb-howto-badge" aria-hidden="true">
              {badge}
            </span>
          )}
          <h2 className="cb-howto-card-title">{t(title)}</h2>
          <p className="cb-howto-card-body">{t(body)}</p>
          {id === 'split' && <Seating />}
        </PixelPanel>
      ))}
    </>
  );
};
