import type { TMusicId, TPlayOpts, TSoundId } from '../domain/types';

/**
 * Imperative sound port (not a data source — no TanStack Query). The WebAudio
 * adapter synthesizes everything; the no-op adapter is used in tests and when
 * sound is unsupported.
 */
export type TSoundApi = {
  /** Create/resume the AudioContext. Must run inside a user gesture (iOS). */
  unlock(): void;
  setEnabled(on: boolean): void;
  /** Master volume (0–1); persists until changed. Default 0.55. */
  setVolume(level: number): void;
  /** Duck music volume (e.g. while the pause sheet is open). */
  duck(on: boolean): void;
  play(id: TSoundId, opt?: TPlayOpts): void;
  music(id: TMusicId | null): void;
};
