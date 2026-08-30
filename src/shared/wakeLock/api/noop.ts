import type { TWakeLockApi } from './index';

/** No-op wake lock for tests and unsupported browsers. */
export function createWakeLockNoopApi(): TWakeLockApi {
  return {
    async request() {},
    async release() {},
  };
}
