import type { FC, HTMLAttributes } from 'react';
import './chrome.css';

type TPixelPanelProps = HTMLAttributes<HTMLDivElement>;

/** The card: cream with a chunky dark-violet outline and hard lip, on every background (calm or burst). */
export const PixelPanel: FC<TPixelPanelProps> = ({ className, children, ...rest }) => (
  <div className={['cb-card', className ?? ''].filter(Boolean).join(' ')} {...rest}>
    {children}
  </div>
);
