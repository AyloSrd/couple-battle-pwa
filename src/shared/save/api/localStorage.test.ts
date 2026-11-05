import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '@/shared/game/domain/game';
import { encode } from '../domain/codec';
import { defaultProfile } from '../domain/types';
import { PROFILE_BAD_KEY, STORAGE_KEYS, createSaveLocalStorageApi } from './localStorage';
import { createMemoryStorage, createSaveMemoryApi } from './memory';

const NOW = Date.UTC(2026, 10, 5, 20, 0, 0);
const game = newGame({
  roster: [{ teamId: 't1', avatarId: 'otters', players: ['A', 'B'] }],
  mode: 'dilemma',
  difficulty: 'mix',
  themes: [],
  deck: [{ id: 1, type: 'who_of_two' }],
});
const newer = JSON.stringify({ v: 99, savedAt: NOW, data: {} });

describe('createSaveLocalStorageApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('nothing stored: defaults, no game, no issue, persistent', () => {
    expect(createSaveMemoryApi().load()).toEqual({ profile: defaultProfile(), game: null, issues: [], persistent: true });
  });

  it('reads back what it wrote, as { v, savedAt, data } strings under cb.*', () => {
    const storage = createMemoryStorage();
    const api = createSaveMemoryApi(storage);
    const profile = { ...defaultProfile(), seenIds: [3] };
    api.write('profile', profile);
    api.write('game', game);
    expect(storage.getItem(STORAGE_KEYS.profile)).toBe(encode('profile', profile, NOW));
    expect(api.raw('game')).toBe(encode('game', game, NOW));
    expect(api.load()).toEqual({ profile, game: { game, savedAt: NOW }, issues: [], persistent: true });
    api.remove('game');
    expect(api.raw('game')).toBeNull();
    expect(storage.keys()).toEqual([STORAGE_KEYS.profile]);
  });

  it('a corrupt profile: the raw copy goes to cb.profile.bad, defaults are used, the player is told', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.profile]: '{oops' });
    const loaded = createSaveMemoryApi(storage).load();
    expect(loaded).toMatchObject({ profile: defaultProfile(), issues: ['profileReset'], persistent: true });
    expect(storage.getItem(PROFILE_BAD_KEY)).toBe('{oops');
    expect(storage.getItem(STORAGE_KEYS.profile)).toBe('{oops'); // load never writes the main key
  });

  it('cb.profile.bad is never overwritten: the first bad copy wins', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.profile]: 'second', [PROFILE_BAD_KEY]: 'first' });
    createSaveMemoryApi(storage).load();
    expect(storage.getItem(PROFILE_BAD_KEY)).toBe('first');
  });

  it('when the backup cannot be written, nothing may be written this session', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.profile]: 'bad' });
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(createSaveMemoryApi(storage).load()).toMatchObject({ issues: ['profileReset'], persistent: false });
  });

  it.each([
    ['profile', STORAGE_KEYS.profile],
    ['game', STORAGE_KEYS.game],
  ])('a %s from a newer app (downgrade): defaults in memory, not persistent, storage untouched', (_key, storageKey) => {
    const storage = createMemoryStorage({ [storageKey]: newer });
    const setItem = vi.spyOn(storage, 'setItem');
    const loaded = createSaveMemoryApi(storage).load();
    expect(loaded).toMatchObject({ profile: defaultProfile(), game: null, issues: [], persistent: false });
    expect(setItem).not.toHaveBeenCalled();
    expect(storage.getItem(storageKey)).toBe(newer);
  });

  it('an unreadable game is reported as invalid (the store discards it)', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.game]: JSON.stringify({ v: 1, savedAt: NOW, data: { ctx: {} } }) });
    expect(createSaveMemoryApi(storage).load().game).toBe('invalid');
  });

  it('a browser that forbids storage throws from load(), never while the adapter is built', () => {
    const api = createSaveLocalStorageApi(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => api.load()).toThrow('denied');
  });

  it('the memory twin stores strings only, like localStorage', () => {
    const storage = createMemoryStorage();
    storage.setItem('k', 42 as unknown as string);
    expect(storage.getItem('k')).toBe('42');
    expect(storage.getItem('missing')).toBeNull();
  });
});
