import { createContext, useContext, useSyncExternalStore, type FC, type PropsWithChildren } from 'react';
import type { TSaveState, TSaveStore } from './store';

const SaveStoreCtx = createContext<TSaveStore | null>(null);

export const SaveStoreProvider: FC<PropsWithChildren<{ store: TSaveStore }>> = ({ store, children }) => (
  <SaveStoreCtx.Provider value={store}>{children}</SaveStoreCtx.Provider>
);

/** The store itself, for its actions. */
export function useSaveStore(): TSaveStore {
  const store = useContext(SaveStoreCtx);
  if (!store) throw new Error('SaveStoreProvider not found in tree');
  return store;
}

/** Subscribe to one slice. The selector must return a stored reference (never a new object). */
export function useSave<T>(selector: (state: TSaveState) => T): T {
  const store = useSaveStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}

export const selectGame = (s: TSaveState) => s.game;
export const selectProfile = (s: TSaveState) => s.profile;
export const selectSettings = (s: TSaveState) => s.profile.settings;
export const selectStatus = (s: TSaveState) => s.status;
export const selectIssues = (s: TSaveState) => s.issues;
