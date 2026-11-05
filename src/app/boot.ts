import { importLegacyIdb } from '@/shared/save/api/idbImport';
import { createSaveStore, type TLoaded, type TSaveApi, type TSaveStore } from '@/shared/save';
import { createDraftStore, type TDraftStore } from '@/shared/session';
import { createContainer, type TContainer } from './container';

/** Everything the app runs on, built once before the first render (also the router context). */
export type TBooted = { container: TContainer; store: TSaveStore; draft: TDraftStore };

/** Read the save; storage that throws (blocked, private mode) → memory, and the banner says so. */
function load(container: TContainer): { saveApi: TSaveApi; loaded: TLoaded } {
  try {
    return { saveApi: container.saveApi, loaded: container.saveApi.load() };
  } catch (error) {
    console.warn('save storage unavailable, this session is not saved', error);
    const saveApi = createContainer('memory').saveApi;
    return { saveApi, loaded: { ...saveApi.load(), persistent: false } };
  }
}

/**
 * Boot, in order: the one-time IndexedDB import → `load()` → the save store → `recover()` (a
 * pending finish is replayed, a bad game discarded). Never throws over storage; anything else
 * that throws reaches `bootstrap()`'s crash screen.
 */
export async function boot(container: TContainer = createContainer(), idb?: IDBFactory): Promise<TBooted> {
  try {
    await importLegacyIdb(container.saveApi, idb);
  } catch {
    // never blocks the boot (storage itself may be what throws)
  }
  const { saveApi, loaded } = load(container);
  const store = createSaveStore(saveApi, loaded);
  // Deck ids are language-free: any one bank tells whether an id still exists.
  const bank = new Set(container.questionsApi.list({ lang: loaded.profile.settings.lang }).map((q) => q.id));
  store.recover((id) => bank.has(id));
  return { container: { ...container, saveApi }, store, draft: createDraftStore() };
}
