import type { TSaveKey, TSaveShape } from '../domain/types';

/**
 * One port over one IndexedDB store, keyed by save-key. `get` returns the
 * key's default when it has never been written — and ALSO when the stored
 * value no longer fits its schema (stale/corrupt saves degrade to "never
 * written", never throw); `put` validates before storing. Zod parsing happens
 * inside the adapters.
 */
export type TSaveApi = {
  get<K extends TSaveKey>(key: K): Promise<TSaveShape[K]>;
  put<K extends TSaveKey>(key: K, value: TSaveShape[K]): Promise<TSaveShape[K]>;
};
