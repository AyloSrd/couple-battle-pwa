import { decode, encode } from '../domain/codec';
import { defaultProfile, type TSaveIssue, type TSaveKey } from '../domain/types';
import type { TLoaded, TLoadedGame, TSaveApi } from './index';

/** The slice of the Web Storage API the adapter uses (a memory twin implements it for tests). */
export type TStringStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const STORAGE_KEYS = { profile: 'cb.profile', game: 'cb.game' } as const satisfies Record<TSaveKey, string>;
/** The first profile that failed to decode, kept as-is and never overwritten (S2). */
export const PROFILE_BAD_KEY = 'cb.profile.bad';

/**
 * Save port over Web Storage (`localStorage`: synchronous, ≈ 5 MB, the values are a few KB).
 * `storage` is a getter so a browser that forbids storage access throws inside `load()` (boot
 * then falls back to memory), never while the container is built.
 */
export function createSaveLocalStorageApi(storage: () => TStringStorage = () => window.localStorage): TSaveApi {
  return {
    load(): TLoaded {
      const s = storage();
      const issues: TSaveIssue[] = [];
      let persistent = true;

      const rawProfile = s.getItem(STORAGE_KEYS.profile);
      const profile = decode('profile', rawProfile);
      if (profile.kind === 'invalid' && rawProfile !== null) {
        issues.push('profileReset');
        try {
          // Copy the unreadable profile BEFORE anything can write the main key.
          if (s.getItem(PROFILE_BAD_KEY) === null) s.setItem(PROFILE_BAD_KEY, rawProfile);
        } catch {
          persistent = false; // no backup → never overwrite the only copy
        }
      }
      if (profile.kind === 'newer') persistent = false;

      const game = decode('game', s.getItem(STORAGE_KEYS.game));
      if (game.kind === 'newer') persistent = false;
      const loadedGame: TLoadedGame =
        game.kind === 'ok' ? { game: game.data, savedAt: game.savedAt } : game.kind === 'invalid' ? 'invalid' : null;

      return {
        profile: profile.kind === 'ok' ? profile.data : defaultProfile(),
        game: loadedGame,
        issues,
        persistent,
      };
    },
    write(key, value) {
      storage().setItem(STORAGE_KEYS[key], encode(key, value, Date.now()));
    },
    remove(key) {
      storage().removeItem(STORAGE_KEYS[key]);
    },
    raw(key) {
      return storage().getItem(STORAGE_KEYS[key]);
    },
  };
}
