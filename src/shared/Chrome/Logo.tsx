import type { FC } from 'react';
import logo480 from '@/assets/art/logo-480.webp';
import logo960 from '@/assets/art/logo-960.webp';
import './chrome.css';

/** The approved Couple Battle logo (never redrawn), 1x/2x. */
export const Logo: FC<{ alt: string; small?: boolean; className?: string }> = ({ alt, small = false, className }) => (
  <img
    className={['cb-logo', small ? 'cb-logo--sm' : '', className ?? ''].filter(Boolean).join(' ')}
    src={logo480}
    width={480}
    height={373}
    srcSet={`${logo480} 1x, ${logo960} 2x`}
    alt={alt}
    draggable={false}
  />
);
