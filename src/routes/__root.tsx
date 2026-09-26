import type { FC } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { TContainer } from '../app/container';
import { QuestionsApiProvider } from '@/shared/questions/provider';
import { SaveApiProvider } from '@/shared/save';
import { SoundApiProvider } from '@/shared/sound';
import { WakeLockApiProvider } from '@/shared/wakeLock';
import { DraftGameProvider } from '@/shared/session';
import { LangGate } from './-LangGate';

/** Router context: the DI container plus the query client. */
export type TRouterContext = TContainer & { queryClient: QueryClient };

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
