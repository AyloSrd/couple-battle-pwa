import { describe, expect, it } from 'vitest';
import { bootHash } from './bootRoute';

describe('bootHash', () => {
  it.each(['#/setup', '#/mode', '#/difficulty', '#/setup/', '#/mode?x=1'])(
    'sends the memory-only new-game route %s back to Home',
    (hash) => {
      expect(bootHash(hash)).toBe('#/');
    },
  );

  it.each(['', '#', '#/', '#/play', '#/settings', '#/how-to-play', '#/about', '#/legal', '#/setupx'])(
    'keeps %s (it survives a reload on its own)',
    (hash) => {
      expect(bootHash(hash)).toBeNull();
    },
  );
});
