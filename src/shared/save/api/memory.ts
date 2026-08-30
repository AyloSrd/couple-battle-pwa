import {
  SAVE_DEFAULTS,
  SAVE_SCHEMAS,
  type TSaveShape,
} from '../domain/types';
import type { TSaveApi } from './index';

/**
 * In-memory save for tests and the pre-persist new-game session. Seed with a
 * partial fixture; unspecified keys fall back to defaults.
 */
export function createSaveMemoryApi(seed?: Partial<TSaveShape>): TSaveApi {
  const store: TSaveShape = { ...structuredClone(SAVE_DEFAULTS), ...seed };

  return {
    async get(key) {
      return structuredClone(store[key]);
    },
    async put(key, value) {
      const parsed = SAVE_SCHEMAS[key].parse(value) as TSaveShape[typeof key];
      store[key] = parsed;
      return structuredClone(parsed);
    },
  };
}
