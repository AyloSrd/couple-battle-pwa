import type { TMusicId, TPlayOpts, TSoundId } from '../domain/types';

/** The app's sound output: synthesized SFX, pre-rendered music, the cues' haptics. */
export type TSoundApi = {
  setEnabled(on: boolean): void;
  /** Cues buzz (where `navigator.vibrate` exists), independent of `setEnabled`. Off until set. */
  setHaptics(on: boolean): void;
  /** Lower the music (pause sheet). */
  duck(on: boolean): void;
  play(id: TSoundId, opt?: TPlayOpts): void;
  music(id: TMusicId | null): void;
};
