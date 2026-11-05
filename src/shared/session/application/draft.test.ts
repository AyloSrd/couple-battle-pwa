import { describe, expect, it, vi } from 'vitest';
import { createDraftStore } from './draft';
import { EMPTY_DRAFT } from '../domain/types';

describe('createDraftStore', () => {
  it('starts empty, merges patches, clears, and notifies subscribers', () => {
    const store = createDraftStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.get()).toEqual(EMPTY_DRAFT);

    const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['A', 'B'] as [string, string] }];
    store.set({ roster });
    store.set({ mode: 'flash' });
    expect(store.get()).toEqual({ roster, mode: 'flash' });

    store.clear();
    expect(store.get()).toEqual(EMPTY_DRAFT);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.set({ mode: 'dilemma' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
