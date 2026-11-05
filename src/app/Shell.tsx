import { useEffect, useState, type FC, type PropsWithChildren } from 'react';
import { LangProvider, useT } from '@/shared/i18n';
import { QuestionsApiProvider } from '@/shared/questions';
import { SaveStoreProvider, selectIssues, selectSettings, selectStatus, useSave, useSaveStore } from '@/shared/save';
import { DraftProvider } from '@/shared/session';
import { soundEngine } from '@/shared/sound';
import { Notice } from '@/shared/Chrome';
import type { TBooted } from './boot';

/** How long a one-off notice (settings reset) stays up. */
export const NOTICE_MS = 4000;

/** The one provider stack: questions port, save store, draft, and the language (from settings). */
export const AppProviders: FC<PropsWithChildren<TBooted>> = ({ container, store, draft, children }) => (
  <SaveStoreProvider store={store}>
    <DraftProvider store={draft}>
      <QuestionsApiProvider api={container.questionsApi}>
        <SettingsLang>{children}</SettingsLang>
      </QuestionsApiProvider>
    </DraftProvider>
  </SaveStoreProvider>
);

/** `LangProvider` controlled by the saved settings: one owner, read once, no mirror. A pick is
 *  `store.updateSettings({ lang })` (`LanguagePicker`); the provider follows. */
const SettingsLang: FC<PropsWithChildren> = ({ children }) => {
  const { lang } = useSave(selectSettings);
  return <LangProvider lang={lang}>{children}</LangProvider>;
};

/** Save status for the player: storage off, a write failing (with Retry), settings reset at boot. */
const SaveNotices: FC = () => {
  const t = useT();
  const store = useSaveStore();
  const status = useSave(selectStatus);
  const issues = useSave(selectIssues);
  const [memoryClosed, setMemoryClosed] = useState(false);

  const handleRetry = () => store.retry();
  const handleCloseMemory = () => setMemoryClosed(true);
  const handleProfileShown = () => store.dismissIssue('profileReset');

  if (status === 'failing') {
    return (
      <Notice tone="error" action={{ label: t('save.retry'), onClick: handleRetry }}>
        {t('save.failing')}
      </Notice>
    );
  }
  if (status === 'memory' && !memoryClosed) {
    return (
      <Notice tone="error" action={{ label: t('common.close'), onClick: handleCloseMemory }}>
        {t('save.memory')}
      </Notice>
    );
  }
  if (issues.includes('profileReset')) {
    return (
      <Notice autoHideMs={NOTICE_MS} onHide={handleProfileShown}>
        {t('save.profileReset')}
      </Notice>
    );
  }
  return null;
};

/**
 * App-wide UI around every route: sound follows `settings.sound`; dirty saves are re-sent when
 * the page is hidden (the OS may kill it next); the save notices.
 */
export const Shell: FC<PropsWithChildren> = ({ children }) => {
  const store = useSaveStore();
  const { sound } = useSave(selectSettings);

  useEffect(() => {
    soundEngine.setEnabled(sound);
  }, [sound]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') store.retry();
    };
    const onPageHide = () => store.retry();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [store]);

  return (
    <>
      {children}
      <SaveNotices />
    </>
  );
};
