import { useEffect, type FC, type PropsWithChildren } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { TContainer } from '../app/container';
import { QuestionsApiProvider } from '@/shared/questions/provider';
import { SAVE_DEFAULTS, SaveApiProvider, useGetSave, usePutSave } from '@/shared/save';
import { SoundApiProvider, useSoundApi } from '@/shared/sound';
import { WakeLockApiProvider } from '@/shared/wakeLock';
import { LangProvider, type TLang } from '@/shared/i18n';
import { DraftGameProvider } from '@/shared/session';

/** Router context: the DI container plus the query client. */
export type TRouterContext = TContainer & { queryClient: QueryClient };

/**
 * Reads persisted settings once, applies the sound preference, and seeds the
 * language context (persisting changes back to settings). Renders nothing only
 * while the read is pending; if it fails (IndexedDB unavailable/corrupt), falls
 * back to the defaults so the app still boots — language changes still try to
 * persist.
 */
export const LangGate: FC<PropsWithChildren> = ({ children }) => {
  const settingsQuery = useGetSave('settings');
  const putSettings = usePutSave('settings');
  const soundApi = useSoundApi();
  // Keep already-loaded data if a later refetch fails; defaults only when nothing loaded.
  const settings =
    settingsQuery.data ?? (settingsQuery.isError ? SAVE_DEFAULTS.settings : undefined);

  useEffect(() => {
    if (settings) soundApi.setEnabled(settings.sound);
  }, [soundApi, settings]);

  if (!settings) return null;

  const persistLang = (lang: TLang) => {
    putSettings.mutate({ ...settings, lang });
  };

  return (
    <LangProvider initialLang={settings.lang} onLangChange={persistLang}>
      {children}
    </LangProvider>
  );
};

const RootLayout: FC = () => {
  const { questionsApi, saveApi, soundApi, wakeLockApi } = Route.useRouteContext();
  return (
    <QuestionsApiProvider api={questionsApi}>
      <SaveApiProvider api={saveApi}>
        <SoundApiProvider api={soundApi}>
          <WakeLockApiProvider api={wakeLockApi}>
            <LangGate>
              <DraftGameProvider>
                <Outlet />
              </DraftGameProvider>
            </LangGate>
          </WakeLockApiProvider>
        </SoundApiProvider>
      </SaveApiProvider>
    </QuestionsApiProvider>
  );
};

export const Route = createRootRouteWithContext<TRouterContext>()({
  component: RootLayout,
});
