import type { FC, HTMLAttributes } from 'react';
import './chrome.css';

type TScreenProps = HTMLAttributes<HTMLElement> & {
  /** Vertically + horizontally center the content (for short screens). */
  center?: boolean;
};

/** Full-height one-handed screen column with safe-area padding. */
export const Screen: FC<TScreenProps> = ({ center = false, className, children, ...rest }) => (
  <main
    className={['cb-screen', center ? 'cb-screen--center' : '', className ?? '']
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </main>
);
