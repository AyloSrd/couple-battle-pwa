import { useState, type FC, type PropsWithChildren } from 'react';
import { LangProvider, type TLang } from '@/shared/i18n';
import { Splash } from './Splash';

export const SPLASH_SEEN_KEY = 'cb-splash-seen';

function readSplashSeen(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

type TBootProps = PropsWithChildren<{
  /** Persisted language, for the splash's skip label (the router has its own provider). */
  lang: TLang;
}>;

/**
 * Plays the Ninou splash ahead of the router on a genuine cold start (new tab / installed
 * icon). Gated to once per browser session, so a reload or the auto-update reload
 * mid-game goes straight back to the current route instead of replaying the clip.
 * The app (children) mounts only when the splash is done — it never blocks on it.
 */
export const Boot: FC<TBootProps> = ({ lang, children }) => {
  const [done, setDone] = useState(readSplashSeen);

  const handleDone = () => {
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
      // storage unavailable — the splash just replays on reload, no harm.
    }
    setDone(true);
  };

  if (done) return <>{children}</>;
  return (
    <LangProvider initialLang={lang}>
      <Splash onDone={handleDone} />
    </LangProvider>
  );
};
