import { describe, expect, it } from 'vitest';
import { clampIndex, indexFromKey, indexFromScroll } from './carousel';

describe('clampIndex', () => {
  it('keeps the index inside the slides', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(7, 3)).toBe(2);
  });
  it('is 0 for an empty carousel', () => {
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe('indexFromScroll', () => {
  it('rounds to the nearest slide', () => {
    expect(indexFromScroll(0, 300, 3)).toBe(0);
    expect(indexFromScroll(149, 300, 3)).toBe(0);
    expect(indexFromScroll(151, 300, 3)).toBe(1);
    expect(indexFromScroll(600, 300, 3)).toBe(2);
  });
  it('stays in range on overscroll (iOS rubber-banding)', () => {
    expect(indexFromScroll(-40, 300, 3)).toBe(0);
    expect(indexFromScroll(900, 300, 3)).toBe(2);
  });
  it('guards a zero-width track (hidden / not laid out)', () => {
    expect(indexFromScroll(120, 0, 3)).toBe(0);
  });
});

describe('indexFromKey', () => {
  it('steps with the arrow keys', () => {
    expect(indexFromKey('ArrowRight', 0, 3)).toBe(1);
    expect(indexFromKey('ArrowLeft', 2, 3)).toBe(1);
  });
  it('does not move past either end', () => {
    expect(indexFromKey('ArrowLeft', 0, 3)).toBeNull();
    expect(indexFromKey('ArrowRight', 2, 3)).toBeNull();
  });
  it('jumps with Home / End', () => {
    expect(indexFromKey('Home', 2, 3)).toBe(0);
    expect(indexFromKey('End', 0, 3)).toBe(2);
    expect(indexFromKey('Home', 0, 3)).toBeNull();
  });
  it('ignores other keys', () => {
    expect(indexFromKey('Enter', 0, 3)).toBeNull();
    expect(indexFromKey('a', 1, 3)).toBeNull();
  });
});
