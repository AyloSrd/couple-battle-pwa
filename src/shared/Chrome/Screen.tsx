import type { FC, HTMLAttributes } from 'react';
import './chrome.css';

type TScreenProps = HTMLAttributes<HTMLElement> & {
  /** Vertically + horizontally center the content (for short screens). */
  center?: boolean;
  /**
   * Spotlight stage — the dark theatrical mode. ONLY for the big beats:
   * countdown, rapid-fire finale, scoreboard, final results, studio splash.
   * Everything else is the default Paper. Set here on the shell, never per component.
   */
  stage?: boolean;
};

/** Full-height one-handed screen column (Paper by default, Spotlight on `stage`). */
export const Screen: FC<TScreenProps> = ({ center = false, stage = false, className, children, ...rest }) => (
  <main
    className={['cb-page', stage ? 'cb-stage' : '', center ? 'cb-page--center' : '', className ?? '']
      .filter(Boolean)
      .join(' ')}
    {...(stage ? { 'data-stage': '' } : {})}
    {...rest}
  >
    {children}
  </main>
);
