import type { FC, HTMLAttributes } from 'react';
import { cx } from './kit';
import './chrome.css';

type TScreenProps = HTMLAttributes<HTMLElement> & {
  /** Vertically + horizontally center the content (for short screens). */
  center?: boolean;
  /** "Burst" stage (stronger rays + pink core) for the big beats ONLY: countdown, rapid-fire
   *  finale, scoreboard, final results. Set here on the shell, never per component. */
  burst?: boolean;
};

/** Full-height one-handed screen column (calm violet stage by default, burst rays on `burst`). */
export const Screen: FC<TScreenProps> = ({ center = false, burst = false, className, children, ...rest }) => (
  <main className={cx('cb-page', burst && 'cb-burst', center && 'cb-page--center', className)} {...rest}>
    {children}
  </main>
);
