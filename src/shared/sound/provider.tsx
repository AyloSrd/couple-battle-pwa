import { createContext, useContext, type FC, type PropsWithChildren } from 'react';
import type { TSoundApi } from './api';

const SoundApiCtx = createContext<TSoundApi | null>(null);

export const SoundApiProvider: FC<PropsWithChildren<{ api: TSoundApi }>> = ({
  api,
  children,
}) => <SoundApiCtx.Provider value={api}>{children}</SoundApiCtx.Provider>;

export function useSoundApi(): TSoundApi {
  const ctx = useContext(SoundApiCtx);
  if (!ctx) throw new Error('SoundApiProvider not found in tree');
  return ctx;
}
