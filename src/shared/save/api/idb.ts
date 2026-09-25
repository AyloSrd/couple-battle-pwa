import { openDB, type IDBPDatabase } from 'idb';
import { SAVE_DEFAULTS, SAVE_SCHEMAS, type TSaveShape } from '../domain/types';
import { isSnapshotStale } from '../domain/services';
import type { TSaveApi } from './index';

const DB_NAME = 'couple-battle';
const STORE = 'save';
const DB_VERSION = 1;

/**
 * Open (and migrate) the single save database. Call once, in the container.
 *
 * `blocked` fires when an older tab still holds a connection to a previous
 * version — that tab needs to close before this open can proceed, so it
 * never resolves on its own; reject instead so the caller can fall back
 * (rather than hang forever). `blocking` is the mirror case (this tab is the
 * one holding an old connection open against a newer one elsewhere) — close
 * it so the other tab can proceed.
 */
export function openSaveDb(): Promise<IDBPDatabase> {
  return new Promise((resolve, reject) => {
    openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
      blocked(_currentVersion, _blockedVersion, _event) {
        reject(new Error('openSaveDb: blocked by another open connection'));
      },
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase).close();
      },
    }).then(resolve, reject);
  });
}

/**
 * Save port backed by IndexedDB. Zod parses on the way in and out.
 *
 * A stored value that no longer fits its schema (e.g. an in-progress game
 * saved with a team that has since been retired) must never take the app
 * down: `get` falls back to the key's default and drops the stale record, so
 * a corrupt/outdated save degrades to "never written" instead of throwing.
 * A `gameSnapshot` past its resume window (`isSnapshotStale`) is dropped the
 * same way.
 */
export function createSaveIdbApi(db: IDBPDatabase): TSaveApi {
  return {
    async get(key) {
      const raw = await db.get(STORE, key);
      if (raw === undefined) {
        return structuredClone(SAVE_DEFAULTS[key]);
      }
      const result = SAVE_SCHEMAS[key].safeParse(raw);
      if (!result.success) {
        await db.delete(STORE, key); // self-heal: don't keep failing on every load
        return structuredClone(SAVE_DEFAULTS[key]);
      }
      if (key === 'gameSnapshot') {
        // An expired (or future-dated) in-progress game is treated like a
        // corrupt one: dropped, so neither Home's Resume nor #/play can bring
        // it back.
        const snapshot = result.data as TSaveShape['gameSnapshot'];
        if (snapshot !== null && isSnapshotStale(snapshot, Date.now())) {
          await db.delete(STORE, key);
          return structuredClone(SAVE_DEFAULTS[key]);
        }
      }
      return result.data as TSaveShape[typeof key];
    },
    async put(key, value) {
      const parsed = SAVE_SCHEMAS[key].parse(value) as TSaveShape[typeof key];
      await db.put(STORE, parsed, key);
      return parsed;
    },
  };
}
