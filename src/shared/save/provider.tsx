import { createContext, useContext, type FC, type PropsWithChildren } from 'react';
import type { TSaveApi } from './api';

const SaveApiCtx = createContext<TSaveApi | null>(null);

export const SaveApiProvider: FC<PropsWithChildren<{ api: TSaveApi }>> = ({
  api,
  children,
}) => <SaveApiCtx.Provider value={api}>{children}</SaveApiCtx.Provider>;

export function useSaveApi(): TSaveApi {
  const ctx = useContext(SaveApiCtx);
  if (!ctx) throw new Error('SaveApiProvider not found in tree');
  return ctx;
}
