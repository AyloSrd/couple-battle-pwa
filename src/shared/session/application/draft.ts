import { EMPTY_DRAFT, type TDraft } from '../domain/types';

export type TDraftStore = ReturnType<typeof createDraftStore>;

/**
 * The draft lives outside React so route guards (`beforeLoad`) can read it as well as screens.
 * Two fields that change twice per game: a tiny subscribe/get store, nothing more.
 */
export function createDraftStore() {
  let draft: TDraft = EMPTY_DRAFT;
  const listeners = new Set<() => void>();
  const publish = (next: TDraft) => {
    draft = next;
    listeners.forEach((listener) => listener());
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => draft,
    set: (patch: Partial<TDraft>) => publish({ ...draft, ...patch }),
    clear: () => publish(EMPTY_DRAFT),
  };
}
