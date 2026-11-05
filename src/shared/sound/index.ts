import { createSoundWebAudioApi } from './api/webAudio';
import type { TSoundApi } from './api';

export type { TSoundApi } from './api';
export type { TSoundId, TMusicId, TPlayOpts } from './domain/types';

/** Sound is UI output, not a port: one engine for the app, silent without an AudioContext
 *  (jsdom, old browsers), driven by the shell from the settings. Tests spy on its methods. */
export const soundEngine: TSoundApi = createSoundWebAudioApi();

export function useSound(): TSoundApi {
  return soundEngine;
}
