import type { FC, HTMLAttributes } from 'react';
import './chrome.css';

type TPixelPanelProps = HTMLAttributes<HTMLDivElement>;

/** The paper card: white on a 2px lip. Stays light on the Spotlight stage (a lit object). */
export const PixelPanel: FC<TPixelPanelProps> = ({ className, children, ...rest }) => (
  <div className={['cb-card', className ?? ''].filter(Boolean).join(' ')} {...rest}>
    {children}
  </div>
);
