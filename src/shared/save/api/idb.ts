import { openDB, type IDBPDatabase } from 'idb';
import { SAVE_DEFAULTS, SAVE_SCHEMAS, type TSaveShape } from '../domain/types';
import type { TSaveApi } from './index';

const DB_NAME = 'couple-battle';
const STORE = 'save';
const DB_VERSION = 1;

/** Open (and migrate) the single save database. Call once, in the container. */
export function openSaveDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

/** Save port backed by IndexedDB. Zod parses on the way in and out. */
export function createSaveIdbApi(db: IDBPDatabase): TSaveApi {
  return {
    async get(key) {
      const raw = await db.get(STORE, key);
      if (raw === undefined) {
        return structuredClone(SAVE_DEFAULTS[key]);
      }
      return SAVE_SCHEMAS[key].parse(raw) as TSaveShape[typeof key];
    },
    async put(key, value) {
      const parsed = SAVE_SCHEMAS[key].parse(value) as TSaveShape[typeof key];
      await db.put(STORE, parsed, key);
      return parsed;
    },
  };
}
