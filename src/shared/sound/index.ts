import { createSoundWebAudioApi } from './api/webAudio';
import type { TSoundApi } from './api';

export type { TSoundApi } from './api';
export type { TSoundId, TMusicId, TPlayOpts } from './domain/types';

/**
 * Sound is UI output, not a data port: one synth engine for the whole app, no provider. It
 * stays silent where there is no AudioContext (jsdom, old browsers); the shell turns it on and
 * off from `settings.sound`. Tests spy on its methods.
 */
export const soundEngine: TSoundApi = createSoundWebAudioApi();

/** The app's sound engine, for a component. */
export function useSound(): TSoundApi {
  return soundEngine;
}
