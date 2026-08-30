import type { FC, HTMLAttributes } from 'react';
import './chrome.css';

type TPixelPanelProps = HTMLAttributes<HTMLDivElement>;

/** Bordered pixel card/dialog frame. */
export const PixelPanel: FC<TPixelPanelProps> = ({ className, children, ...rest }) => (
  <div className={['cb-panel', className ?? ''].filter(Boolean).join(' ')} {...rest}>
    {children}
  </div>
);
