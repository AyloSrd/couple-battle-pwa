import { describe, expect, it } from 'vitest';
import { PRIVACY_URL } from './legal';

describe('PRIVACY_URL', () => {
  it('is the one public privacy page (all four languages on one page), over https', () => {
    expect(PRIVACY_URL).toBe('https://sites.google.com/view/couple-battle-privacy');
  });
});
