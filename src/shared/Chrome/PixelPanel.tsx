import type { FC, HTMLAttributes } from 'react';
import { cx } from './kit';
import './chrome.css';

/** The card: cream with a chunky dark-violet outline and hard lip, on every background (calm or burst). */
export const PixelPanel: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => <div className={cx('cb-card', className)} {...rest} />;
