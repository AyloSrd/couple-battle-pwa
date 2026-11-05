import { createSaveLocalStorageApi, type TStringStorage } from './localStorage';
import type { TSaveApi } from './index';

/** A Web Storage twin over a Map: strings in, strings out, like `localStorage`. */
export function createMemoryStorage(seed: Record<string, string> = {}): TStringStorage & { keys(): string[] } {
  const items = new Map(Object.entries(seed));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
    keys: () => [...items.keys()],
  };
}

/**
 * In-memory save for tests and a session where storage is off. It runs the real adapter over
 * strings, so a value that cannot survive JSON fails here exactly as it would in the browser.
 */
export function createSaveMemoryApi(storage: TStringStorage = createMemoryStorage()): TSaveApi {
  return createSaveLocalStorageApi(() => storage);
}
