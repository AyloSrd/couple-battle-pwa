import { afterEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '@/shared/game';
import { createMemoryStorage, createSaveMemoryApi } from '@/shared/save/api/memory';
import { createSaveLocalStorageApi } from '@/shared/save/api/localStorage';
import { defaultProfile } from '@/shared/save';
import { createQuestionsMemoryApi } from '@/shared/questions/api/memory';
import { seedStorage, expectSynced } from '@/test/expectSynced';
import { fakeIdb } from '@/test/fakeIdb';
import { boot } from './boot';
import { createContainer } from './container';

const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['A', 'B'] as [string, string] }];
const gameWith = (id: number) => newGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: [{ id, type: 'who_of_two' }] });

describe('createContainer', () => {
  it('builds the two data ports and reads nothing (C8: no side effect in the factory)', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const c = createContainer();
    expect(Object.keys(c).sort()).toEqual(['questionsApi', 'saveApi']);
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockRestore();
  });

  it('serves the real JSON catalog (the catalog is always JSON)', () => {
    const c = createContainer('memory');
    expect(c.questionsApi.list({ lang: 'fr' })).toHaveLength(1135);
    const whoOfTwo = c.questionsApi.list({ lang: 'fr', types: ['who_of_two'] });
    expect(whoOfTwo.length).toBeGreaterThan(0);
    expect(whoOfTwo.every((q) => q.type === 'who_of_two')).toBe(true);
  });

  it('the persistent save is not touched until it is read (a browser that forbids storage cannot crash the build)', () => {
    expect(() => createContainer()).not.toThrow();
  });
});

describe('boot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const containerOver = (storage = createMemoryStorage(), ids = [7]) => ({
    questionsApi: createQuestionsMemoryApi(ids.map((id) => ({ id, theme: 'childhood' as const, difficulty: 'easy' as const, type: 'who_of_two' as const, you: 'q', name: 'q' }))),
    saveApi: createSaveMemoryApi(storage),
  });

  it('loads the saved profile and resumes a valid game', async () => {
    const game = gameWith(7);
    const storage = seedStorage({ profile: { settings: { lang: 'es', sound: false, vibration: true } }, game });
    const { store, container } = await boot(containerOver(storage));
    expect(store.get()).toMatchObject({ status: 'ok', issues: [], game, profile: { settings: { lang: 'es' } } });
    expectSynced(store, container.saveApi);
  });

  it('discards a game whose questions are no longer in the bank, and says so', async () => {
    const storage = seedStorage({ game: gameWith(404) });
    const { store, container } = await boot(containerOver(storage));
    expect(store.get()).toMatchObject({ game: null, issues: ['gameDiscarded'] });
    expect(container.saveApi.raw('game')).toBeNull();
  });

  it('storage that throws → a memory session (status memory, the banner says so), never a crash', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = createSaveLocalStorageApi(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const { store } = await boot({ ...containerOver(), saveApi: broken });
    expect(store.get()).toMatchObject({ status: 'memory', profile: defaultProfile(), game: null });
    store.updateSettings({ lang: 'en' }); // play goes on in memory
    expect(store.get().profile.settings.lang).toBe('en');
  });

  it('runs the one-time IndexedDB import before loading, so the old profile is there on first paint', async () => {
    const { idb } = fakeIdb({ 'couple-battle': { save: { settings: { lang: 'en', sound: false }, seenQuestionIds: [3] } } });
    const { store, container } = await boot(containerOver(), idb);
    expect(store.get().profile).toMatchObject({ settings: { lang: 'en', sound: false }, seenIds: [3] });
    expectSynced(store, container.saveApi);
  });
});
