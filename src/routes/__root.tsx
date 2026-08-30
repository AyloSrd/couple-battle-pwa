import { useEffect, type FC, type PropsWithChildren } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { TContainer } from '../app/container';
import { QuestionsApiProvider } from '@/shared/questions/provider';
import { SaveApiProvider, useGetSave, usePutSave } from '@/shared/save';
import { SoundApiProvider, useSoundApi } from '@/shared/sound';
import { WakeLockApiProvider } from '@/shared/wakeLock';
import { LangProvider, type TLang } from '@/shared/i18n';
import { DraftGameProvider } from '@/shared/session';

/** Router context: the DI container plus the query client. */
export type TRouterContext = TContainer & { queryClient: QueryClient };

/**
 * Reads persisted settings once, applies the sound preference, and seeds the
 * language context (persisting changes back to settings). Renders nothing until
 * settings resolve — the Splash view (added with the walking skeleton) will
 * fill this beat.
 */
const LangGate: FC<PropsWithChildren> = ({ children }) => {
  const settingsQuery = useGetSave('settings');
  const putSettings = usePutSave('settings');
  const soundApi = useSoundApi();
  const settings = settingsQuery.data;

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
