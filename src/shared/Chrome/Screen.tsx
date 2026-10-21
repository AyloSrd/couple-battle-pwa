import type { FC, HTMLAttributes } from 'react';
import './chrome.css';

type TScreenProps = HTMLAttributes<HTMLElement> & {
  /** Vertically + horizontally center the content (for short screens). */
  center?: boolean;
  /**
   * Sunburst "burst" background — the pastel rays for the big beats ONLY:
   * countdown, rapid-fire finale, scoreboard, final results.
   * Everything else is the calm pastel Paper. Set here on the shell, never per component.
   */
  burst?: boolean;
};

/** Full-height one-handed screen column (calm Paper by default, sunburst rays on `burst`). */
export const Screen: FC<TScreenProps> = ({ center = false, burst = false, className, children, ...rest }) => (
  <main
    className={['cb-page', burst ? 'cb-burst' : '', center ? 'cb-page--center' : '', className ?? '']
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </main>
);
