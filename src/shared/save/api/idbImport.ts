import { ZProfileSchema } from '../domain/types';
import type { TSaveApi } from './index';

/** The pre-refactor save: one IndexedDB database, one object store, one record per key. */
const LEGACY_DB = 'couple-battle';
const LEGACY_STORE = 'save';
const LEGACY_KEYS = ['settings', 'seenQuestionIds', 'guidelinesSeen', 'soloBest'] as const;
/** An IndexedDB that never answers (seen on iOS Safari) must not hold the boot. */
const TIMEOUT_MS = 3000;

type TLegacy = Partial<Record<(typeof LEGACY_KEYS)[number], unknown>>;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Open the legacy DB only if it exists: a fresh open is aborted so nothing gets created. */
function openExisting(idb: IDBFactory): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const req = idb.open(LEGACY_DB);
    let created = false;
    req.onupgradeneeded = () => {
      created = true;
      req.transaction?.abort();
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => (created ? resolve(null) : reject(req.error));
  });
}

async function readLegacy(db: IDBDatabase): Promise<TLegacy | null> {
  if (!db.objectStoreNames.contains(LEGACY_STORE)) return null;
  const store = db.transaction(LEGACY_STORE, 'readonly').objectStore(LEGACY_STORE);
  const values = await Promise.all(LEGACY_KEYS.map((key) => request(store.get(key))));
  return Object.fromEntries(LEGACY_KEYS.map((key, i) => [key, values[i]]));
}

async function run(api: TSaveApi, idb: IDBFactory, timedOut: () => boolean): Promise<void> {
  if (api.raw('profile') !== null) return; // already on the new save
  const db = await openExisting(idb);
  if (!db) return;
  let legacy: TLegacy | null;
  try {
    legacy = await readLegacy(db);
  } finally {
    db.close();
  }
  if (timedOut()) return; // boot went on without us: never write behind the loaded store
  if (legacy) {
    // Per-field defaults: whatever the old record lacked (or held corrupt) starts fresh.
    const profile = ZProfileSchema.parse({
      settings: legacy.settings,
      seenIds: legacy.seenQuestionIds,
      guidelinesSeen: legacy.guidelinesSeen,
      soloBest: legacy.soloBest,
    });
    api.write('profile', profile); // throws → the old DB is kept for the next launch
  }
  // Not awaited: a tab still holding the old DB open blocks the delete until it closes.
  idb.deleteDatabase(LEGACY_DB);
}

/**
 * One-time move of a pre-refactor player's profile (settings, seen ids, guideline flags, solo
 * bests) from the old IndexedDB save into `cb.profile`, then the old database is deleted. The old
 * in-progress game is dropped: it holds Flash secrets in a shape that cannot be resumed.
 * Runs before `load()`, only while no `cb.profile` exists, and never throws or rejects: IndexedDB
 * missing, blocked or failing just skips it (the old DB stays for a later launch).
 */
export async function importLegacyIdb(api: TSaveApi, idb?: IDBFactory): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    const factory = idb ?? globalThis.indexedDB; // reading it can throw (sandboxed frames)
    if (!factory) return;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve();
      }, TIMEOUT_MS);
    });
    await Promise.race([run(api, factory, () => timedOut), timeout]);
  } catch {
    // skipped: keep the old DB, start on defaults
  } finally {
    clearTimeout(timer);
  }
}
