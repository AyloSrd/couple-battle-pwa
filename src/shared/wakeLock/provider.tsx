import { createContext, useContext, type FC, type PropsWithChildren } from 'react';
import type { TWakeLockApi } from './api';

const WakeLockApiCtx = createContext<TWakeLockApi | null>(null);

export const WakeLockApiProvider: FC<PropsWithChildren<{ api: TWakeLockApi }>> = ({
  api,
  children,
}) => <WakeLockApiCtx.Provider value={api}>{children}</WakeLockApiCtx.Provider>;

export function useWakeLockApi(): TWakeLockApi {
  const ctx = useContext(WakeLockApiCtx);
  if (!ctx) throw new Error('WakeLockApiProvider not found in tree');
  return ctx;
}
