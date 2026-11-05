import { createContext, useContext, useSyncExternalStore, type FC, type PropsWithChildren } from 'react';
import type { TDraft } from '../domain/types';
import type { TDraftStore } from './draft';

const DraftCtx = createContext<TDraftStore | null>(null);

export const DraftProvider: FC<PropsWithChildren<{ store: TDraftStore }>> = ({ store, children }) => (
  <DraftCtx.Provider value={store}>{children}</DraftCtx.Provider>
);

export function useDraft(): { draft: TDraft; draftStore: TDraftStore } {
  const store = useContext(DraftCtx);
  if (!store) throw new Error('DraftProvider not found in tree');
  const draft = useSyncExternalStore(store.subscribe, store.get);
  return { draft, draftStore: store };
}
