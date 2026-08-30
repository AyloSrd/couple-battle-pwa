import { describe, expect, it } from 'vitest';
import { interpolate } from './services';

describe('interpolate', () => {
  it('replaces a single placeholder', () => {
    expect(interpolate('Salut {name} !', { name: 'Morgane' })).toBe('Salut Morgane !');
  });

  it('replaces multiple and repeated placeholders', () => {
    expect(interpolate('{n}/{total} — {n} done', { n: 2, total: 5 })).toBe('2/5 — 2 done');
  });

  it('coerces numbers to strings', () => {
    expect(interpolate('+{points} pts', { points: 2 })).toBe('+2 pts');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('Hi {name}', { other: 'x' })).toBe('Hi {name}');
  });

  it('is a no-op without vars', () => {
    expect(interpolate('plain text')).toBe('plain text');
  });
});
