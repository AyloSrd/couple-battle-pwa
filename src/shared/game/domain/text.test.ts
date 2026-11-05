import { describe, it, expect } from 'vitest';
import { normalizeText } from './text';

describe('normalizeText', () => {
  it('trims and keeps plain text', () => {
    expect(normalizeText('  Alice  ', 16)).toBe('Alice');
  });
  it('composes to NFC so the same name always compares equal', () => {
    expect(normalizeText('Zoé', 16)).toBe('Zoé');
  });
  it('strips zero-width and bidi control characters', () => {
    expect(normalizeText('A​l‮ic⁦e﻿', 16)).toBe('Alice');
  });
  it('returns an empty string for invisible-only input', () => {
    expect(normalizeText('​‍ ⁠', 16)).toBe('');
  });
  it('cuts at max code points without splitting an emoji', () => {
    expect(normalizeText('ab😀cd', 3)).toBe('ab😀');
  });
});
