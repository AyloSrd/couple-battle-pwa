import type { FC } from 'react';
import { crashCopy } from './crash';

const handleRetry = () => window.location.reload();
const handleHome = () => {
  window.location.hash = '#/';
  window.location.reload();
};

/**
 * The root route's error screen. It renders outside the app providers, so it uses none: copy
 * from the strings files by browser language, plain buttons. Saved data is untouched; Retry
 * reloads (the save store reloads exactly what was last written).
 */
export const CrashScreen: FC = () => {
  const copy = crashCopy();
  return (
    <main className="cb-page cb-crash" lang={copy.lang}>
      <h1 className="cb-title">{copy.title}</h1>
      <p>{copy.body}</p>
      <button type="button" className="cb-btn" onClick={handleRetry}>
        {copy.retry}
      </button>
      <button type="button" className="cb-btn cb-btn--ghost" onClick={handleHome}>
        {copy.home}
      </button>
    </main>
  );
};
