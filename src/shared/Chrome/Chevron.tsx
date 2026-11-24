import type { FC } from 'react';

/** The right-pointing arrow at the end of a navigation row (`cb-mode cb-v-nav`). */
export const Chevron: FC = () => (
  <svg className="cb-v-chevron" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
