import { describe, it, expect } from 'vitest';
import { normalizeText } from './text';
import { NAME_MAX, SECRET_MAX } from './game';
import { ZTeamSchema } from './types';

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
  it('cuts at max UTF-16 units (what the save schemas count) without splitting an emoji', () => {
    expect(normalizeText('ab😀cd', 3)).toBe('ab');
    expect(normalizeText('ab😀cd', 4)).toBe('ab😀');
  });
  it('a capped emoji name or secret always fits its schema (decodes on the next boot)', () => {
    const name = normalizeText('😀'.repeat(20), NAME_MAX);
    expect(name.length).toBeLessThanOrEqual(NAME_MAX);
    expect(ZTeamSchema.safeParse({ teamId: 't1', avatarId: 'otters', players: [name, 'B'] }).success).toBe(true);
    expect(normalizeText('🎉'.repeat(30), SECRET_MAX)).toHaveLength(SECRET_MAX);
  });
  it('keeps a zero-width joiner inside an emoji sequence, strips it anywhere else', () => {
    expect(normalizeText('👩\u200d❤️\u200d👨', 16)).toBe('👩\u200d❤️\u200d👨');
    expect(normalizeText('👍🏽\u200d👍', 16)).toBe('👍🏽\u200d👍');
    expect(normalizeText('A\u200dna', 16)).toBe('Ana');
    expect(normalizeText('😀\u200dB', 16)).toBe('😀B');
  });
});
