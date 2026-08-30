import type { TSoundApi } from './index';

/** Silent adapter for tests and environments without WebAudio. */
export function createSoundNoopApi(): TSoundApi {
  return {
    unlock() {},
    setEnabled() {},
    setVolume() {},
    duck() {},
    play() {},
    music() {},
  };
}
