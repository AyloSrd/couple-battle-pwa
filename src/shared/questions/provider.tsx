import { createContext, useContext, type FC, type PropsWithChildren } from 'react';
import type { TQuestionsApi } from './api';

const QuestionsApiCtx = createContext<TQuestionsApi | null>(null);

export const QuestionsApiProvider: FC<PropsWithChildren<{ api: TQuestionsApi }>> = ({
  api,
  children,
}) => <QuestionsApiCtx.Provider value={api}>{children}</QuestionsApiCtx.Provider>;

export function useQuestionsApi(): TQuestionsApi {
  const ctx = useContext(QuestionsApiCtx);
  if (!ctx) throw new Error('QuestionsApiProvider not found in tree');
  return ctx;
}
