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

type TSplashGateProps = PropsWithChildren<{
  /** Saved language, for the splash's skip label (the router mounts its own providers). */
  lang: TLang;
}>;

/** The Ninou splash ahead of the router, once per browser session: a reload (or the auto-update
 *  reload mid-game) goes straight back to the route. Children mount when it ends; it never blocks. */
export const SplashGate: FC<TSplashGateProps> = ({ lang, children }) => {
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
    <LangProvider lang={lang}>
      <Splash onDone={handleDone} />
    </LangProvider>
  );
};
