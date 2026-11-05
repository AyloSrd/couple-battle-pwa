import type { TProfile, TSaveIssue, TSaveKey, TSaveValues } from '../domain/types';

/** A stored game as read at boot: decoded and schema-valid, or `'invalid'` (the store discards it). */
export type TLoadedGame = { game: TSaveValues['game']; savedAt: number } | 'invalid' | null;

export type TLoaded = {
  profile: TProfile;
  game: TLoadedGame;
  issues: TSaveIssue[];
  /** false: nothing may be written this session (storage off, or a save from a newer app). */
  persistent: boolean;
};

/**
 * The save port: synchronous, so the store writes in the same tick as it updates memory
 * (write, then publish). Only the save store calls it. Adapters encode / decode with the
 * domain codec; Zod runs at this boundary.
 */
export type TSaveApi = {
  /** Read and decode both values once, at boot. */
  load(): TLoaded;
  /** Store one whole value. Throws when storage refuses it (the store marks the key dirty). */
  write<K extends TSaveKey>(key: K, value: TSaveValues[K]): void;
  remove(key: TSaveKey): void;
  /** The stored string (tests, the dev read-back, the one-time IDB import). */
  raw(key: TSaveKey): string | null;
};
