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

/** Synchronous, so the store writes in the same tick as it updates memory. Only the store calls it. */
export type TSaveApi = {
  load(): TLoaded; // once, at boot
  /** Store one whole value. Throws when storage refuses it (the store marks the key dirty). */
  write<K extends TSaveKey>(key: K, value: TSaveValues[K]): void;
  remove(key: TSaveKey): void;
  /** The stored string (tests, the dev read-back, the one-time IDB import). */
  raw(key: TSaveKey): string | null;
};
