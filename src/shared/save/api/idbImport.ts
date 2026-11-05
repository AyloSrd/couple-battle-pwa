import { decode } from '../domain/codec';
import { isGameStale } from '../domain/services';
import { ZProfileSchema, type TProfile, type TSaveIssue } from '../domain/types';
import type { TSaveApi } from './index';

/** The pre-refactor save: one IndexedDB database, one object store, one record per key. */
const LEGACY_DB = 'couple-battle';
const LEGACY_STORE = 'save';
const LEGACY_KEYS = ['settings', 'seenQuestionIds', 'guidelinesSeen', 'soloBest', 'gameSnapshot'] as const;
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

/** Legacy history joins the current profile: seen ids ∪, bests and flags max; settings stay. */
function merge(current: TProfile | null, legacy: TProfile): TProfile {
  if (!current) return legacy;
  const best = (mode: keyof TProfile['soloBest']) => Math.max(current.soloBest[mode], legacy.soloBest[mode]);
  const seen = (mode: keyof TProfile['guidelinesSeen']) => current.guidelinesSeen[mode] || legacy.guidelinesSeen[mode];
  return {
    settings: current.settings,
    seenIds: [...new Set([...current.seenIds, ...legacy.seenIds])],
    guidelinesSeen: { flash: seen('flash'), dilemma: seen('dilemma'), ultime: seen('ultime') },
    soloBest: { flash: best('flash'), dilemma: best('dilemma'), ultime: best('ultime') },
  };
}

async function run(api: TSaveApi, idb: IDBFactory, timedOut: () => boolean): Promise<TSaveIssue[]> {
  const db = await openExisting(idb); // runs while the old DB exists, whatever cb.profile holds
  if (!db) return [];
  let legacy: TLegacy | null;
  try {
    legacy = await readLegacy(db);
  } finally {
    db.close();
  }
  if (timedOut()) return []; // boot went on without us: never write behind the loaded store
  const current = decode('profile', api.raw('profile'));
  if (current.kind === 'invalid' || current.kind === 'newer') return []; // load() owns those; retry later
  if (legacy) {
    // Per-field defaults: whatever the old record lacked (or held corrupt) starts fresh.
    const old = ZProfileSchema.parse({ ...legacy, seenIds: legacy.seenQuestionIds });
    api.write('profile', merge(current.kind === 'ok' ? current.data : null, old)); // throws → DB kept
  }
  // Not awaited: a tab still holding the old DB open blocks the delete until it closes.
  idb.deleteDatabase(LEGACY_DB);
  // Its running game (old shape, Flash secrets) cannot resume: say so, never a silent restart.
  const savedAt = (legacy?.gameSnapshot as { savedAt?: unknown } | null | undefined)?.savedAt;
  return typeof savedAt === 'number' && !isGameStale(savedAt, Date.now()) ? ['gameDiscarded'] : [];
}

/**
 * Move a pre-refactor player's history from the old IndexedDB save into `cb.profile` (merged
 * with any profile already there), then delete the old database — only after that write. Runs
 * before `load()` on every boot while the old DB exists, and never rejects: IndexedDB missing,
 * slow, blocked or failing just skips it (the old DB stays for the next launch). Returns the
 * issue to show when a fresh in-progress game was dropped.
 */
export async function importLegacyIdb(api: TSaveApi, idb?: IDBFactory): Promise<TSaveIssue[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    const factory = idb ?? globalThis.indexedDB; // reading it can throw (sandboxed frames)
    if (!factory) return [];
    const timeout = new Promise<TSaveIssue[]>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve([]);
      }, TIMEOUT_MS);
    });
    return await Promise.race([run(api, factory, () => timedOut), timeout]);
  } catch {
    return []; // skipped: keep the old DB, start on defaults
  } finally {
    clearTimeout(timer);
  }
}
