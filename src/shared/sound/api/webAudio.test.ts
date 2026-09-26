import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSoundWebAudioApi } from './webAudio';

describe('createSoundWebAudioApi without an AudioContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('play/music are no-ops instead of throwing when no AudioContext exists', () => {
    // jsdom doesn't implement WebAudio, but stub explicitly so this test holds
    // even if that ever changes.
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);

    const api = createSoundWebAudioApi();

    expect(() => api.play('sfx.tap')).not.toThrow();
    expect(() => api.music('mus.final')).not.toThrow();
    expect(() => api.music(null)).not.toThrow();
  });
});
