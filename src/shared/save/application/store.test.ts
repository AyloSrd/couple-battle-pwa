import { describe, expect, it, vi } from 'vitest';
import { newGame, type TGame } from '@/shared/game/domain/game';
import { reduce, type TGameEventBody } from '@/views/Play/domain/machine';
import { deckSizeFor } from '@/shared/questions/domain/services';
import { GOLDEN_CASES } from '@/test/goldenTrace';
import { playScripted, startOf } from '@/test/scriptedGames';
import { bootTestSave, expectSynced, seedStorage } from '@/test/expectSynced';
import { encode } from '../domain/codec';
import { GAME_MAX_AGE_MS } from '../domain/services';
import { defaultProfile } from '../domain/types';
import { STORAGE_KEYS } from '../api/localStorage';
import { createSaveMemoryApi } from '../api/memory';
import type { TSaveApi } from '../api';
import { createSaveStore } from './store';

const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['Ana', 'Bo'] as [string, string] }];
const dilemma = (ids = [7]) =>
  newGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: ids.map((id) => ({ id, type: 'who_of_two' as const })) });
const step = (game: TGame, body: TGameEventBody) => reduce(game, { ...body, seq: game.ctx.seq });
/** Drive a one-card solo Dilemma to final: ask → resolve → final. */
const toFinal = (game: TGame) => step(step(game, { type: 'next' }), { type: 'verdict', v: 'exact' });

/** Make the adapter's next `count` writes / removes throw, as a full or locked storage would. */
function failNext(api: TSaveApi, count: number) {
  const write = api.write;
  const remove = api.remove;
  let left = count;
  vi.spyOn(api, 'write').mockImplementation((key, value) => {
    if (left-- > 0) throw new DOMException('full', 'QuotaExceededError');
    write(key, value);
  });
  vi.spyOn(api, 'remove').mockImplementation((key) => {
    if (left-- > 0) throw new DOMException('full', 'QuotaExceededError');
    remove(key);
  });
}

describe('save store — write, then publish', () => {
  it('boots on defaults, status ok, in sync', () => {
    const { store, api } = bootTestSave();
    expect(store.get()).toEqual({ profile: defaultProfile(), game: null, status: 'ok', issues: [] });
    expectSynced(store, api);
  });

  it('storage is already written when subscribers hear about a change (same tick)', () => {
    const { store, api } = bootTestSave();
    const seen: (string | null)[] = [];
    store.subscribe(() => seen.push(api.raw('game')));
    const game = dilemma();
    store.startGame(game);
    expect(seen).toEqual([encode('game', game, JSON.parse(api.raw('game')!).savedAt)]);
    expect(store.get().game).toBe(game);
    expectSynced(store, api);
  });

  it('an illegal or stale event (same object back) writes nothing and publishes nothing', () => {
    const { store, api } = bootTestSave();
    store.startGame(dilemma());
    expectSynced(store, api);
    const write = vi.spyOn(api, 'write');
    const listener = vi.fn();
    store.subscribe(listener);
    const result = store.updateGame((g) => reduce(g, { type: 'verdict', v: 'exact', seq: g.ctx.seq })); // ask takes `next` only
    expect(result).toEqual({ changed: false, next: store.get().game });
    expect(store.updateGame((g) => reduce(g, { type: 'next', seq: g.ctx.seq + 1 })).changed).toBe(false); // old seq
    expect(write).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expectSynced(store, api);
  });

  it('settings: a real change is written; the same value writes nothing', () => {
    const { store, api } = bootTestSave();
    const write = vi.spyOn(api, 'write');
    store.updateSettings({ lang: 'fr' });
    expect(write).not.toHaveBeenCalled();
    store.updateSettings({ lang: 'es', vibration: false });
    expect(store.get().profile.settings).toEqual({ lang: 'es', sound: true, vibration: false });
    expect(write).toHaveBeenCalledTimes(1);
    expectSynced(store, api);
    store.markGuidelineSeen('flash');
    expectSynced(store, api);
    store.markGuidelineSeen('flash');
    expect(write).toHaveBeenCalledTimes(2);
    expect(store.get().profile.guidelinesSeen).toEqual({ flash: true, dilemma: false, ultime: false });
  });

  it('reset seen ids empties them and saves', () => {
    const { store, api } = bootTestSave({ profile: { seenIds: [1, 2, 3] } });
    store.resetSeenIds();
    expect(store.get().profile.seenIds).toEqual([]);
    expectSynced(store, api);
  });

  it('selectors see stored references: an unrelated change keeps the game reference', () => {
    const { store } = bootTestSave();
    store.startGame(dilemma());
    const game = store.get().game;
    store.updateSettings({ sound: false });
    expect(store.get().game).toBe(game);
  });
});

describe('save store — scripted full games, 3 modes × 1–4 couples', () => {
  const cases = GOLDEN_CASES.filter((c) => c.deck.length === deckSizeFor(c.mode, c.couples));

  it('covers every mode with 1 to 4 couples', () => {
    expect(cases.map((c) => `${c.mode}${c.couples}`).sort()).toEqual(
      ['dilemma', 'flash', 'ultime'].flatMap((m) => [1, 2, 3, 4].map((n) => `${m}${n}`)).sort(),
    );
  });

  it.each(cases.map((c) => [c.name, c] as const))('%s: in sync after every event, then a relaunch reloads it', (_name, c) => {
    const { store, api, storage } = bootTestSave({ profile: { seenIds: [999] } });
    const start = startOf(c);
    store.startGame(start);
    expectSynced(store, api);
    let relaunched = false;

    const games = playScripted(c, (game, action) => {
      expect(store.get().game).toBe(game);
      const { changed, next } = store.updateGame((current) => reduce(current, { ...action, seq: game.ctx.seq }));
      expect(changed).toBe(true);
      if (next?.step.kind === 'final') store.finishGame(next);
      expectSynced(store, api);
      if (!relaunched && next?.step.kind === 'scoreboard') {
        // relaunch mid-game: a new store over the same storage shows the very same game
        relaunched = true;
        const again = createSaveStore(createSaveMemoryApi(storage), createSaveMemoryApi(storage).load());
        again.recover(() => true);
        expect(again.get()).toEqual(store.get());
      }
      return next!;
    }, start);

    const final = games[games.length - 1]!;
    expect(store.get().game).toBe(final); // memory keeps the final game for the Final screen
    expect(store.get().profile.seenIds).toEqual([999, ...new Set(c.deck.map((card) => card.id))]);

    // relaunch after the game: same profile, no game left to resume
    const reloaded = createSaveMemoryApi(storage);
    const again = createSaveStore(reloaded, reloaded.load());
    again.recover(() => true);
    expect(again.get()).toEqual({ ...store.get(), game: null });
  });
});

describe('save store — finish', () => {
  it('returns the solo line once, keeps the final game in memory, removes it from storage', () => {
    const { store, api } = bootTestSave({ profile: { soloBest: { flash: 0, dilemma: 0, ultime: 0 } } });
    store.startGame(dilemma());
    const { next } = store.updateGame(toFinal);
    expect(api.raw('game')).not.toBeNull(); // the final game is written first
    expect(store.finishGame(next!)).toEqual({ isBest: true, points: 1, best: 1 });
    expect(api.raw('game')).toBeNull();
    expect(store.get().game).toBe(next);
    expect(store.get().profile).toMatchObject({ seenIds: [7], soloBest: { dilemma: 1 } });
    expectSynced(store, api);

    const write = vi.spyOn(api, 'write');
    expect(store.finishGame(next!)).toBeNull(); // once
    expect(store.updateGame((g) => g).changed).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('a crash between the final write and the profile write is replayed at boot, idempotently', () => {
    const final = toFinal(dilemma([7]));
    // storage as the crash left it: the final game written, the profile not merged yet
    const storage = seedStorage({ profile: { seenIds: [1], soloBest: { flash: 0, dilemma: 0, ultime: 0 } }, game: final, savedAt: Date.now() - 2 * GAME_MAX_AGE_MS });
    const boot = () => {
      const api = createSaveMemoryApi(storage);
      const store = createSaveStore(api, api.load());
      store.recover(() => true);
      return { api, store };
    };
    const first = boot();
    expect(first.store.get().game).toBeNull(); // replayed even though old; nothing to show
    expect(first.store.get().issues).toEqual([]);
    expect(first.store.get().profile).toMatchObject({ seenIds: [1, 7], soloBest: { dilemma: 1 } });
    expect(first.api.raw('game')).toBeNull();
    expectSynced(first.store, first.api);

    // and a crash AFTER the profile write but before the removal replays to the same profile
    storage.setItem(STORAGE_KEYS.game, encode('game', final, Date.now()));
    const second = boot();
    expect(second.store.get().profile).toEqual(first.store.get().profile);
    expectSynced(second.store, second.api);
  });

  it('leaveGame clears only a finished game; quitGame throws a running one away', () => {
    const { store, api } = bootTestSave();
    store.startGame(dilemma());
    store.leaveGame();
    expect(store.get().game).not.toBeNull();
    store.quitGame();
    expect(store.get().game).toBeNull();
    expectSynced(store, api);

    store.startGame(dilemma());
    const { next } = store.updateGame(toFinal);
    store.finishGame(next!);
    store.leaveGame();
    expect(store.get().game).toBeNull();
    expectSynced(store, api);
  });
});

describe('save store — recover (boot)', () => {
  const now = Date.now();

  it('resumes a valid game as-is, without writing', () => {
    const game = step(dilemma(), { type: 'next' });
    const storage = seedStorage({ game });
    const api = createSaveMemoryApi(storage);
    const setItem = vi.spyOn(storage, 'setItem');
    const store = createSaveStore(api, api.load());
    store.recover(() => true, now);
    expect(store.get().game).toEqual(game);
    expect(setItem).not.toHaveBeenCalled();
    expectSynced(store, api);
  });

  it('an unreadable game is removed and the player is told', () => {
    const { store, api } = bootTestSave({ raw: { [STORAGE_KEYS.game]: '{"v":1,"savedAt":1,"data":{"ctx":{}}}' } });
    expect(store.get()).toMatchObject({ game: null, issues: ['gameDiscarded'] });
    expect(api.raw('game')).toBeNull();
    expectSynced(store, api);
  });

  it('a game whose deck is not in the bank is removed and the player is told', () => {
    const { store, api } = bootTestSave({ game: dilemma([404]) }, (id) => id !== 404);
    expect(store.get()).toMatchObject({ game: null, issues: ['gameDiscarded'] });
    expectSynced(store, api);
  });

  it('a stale game is removed quietly', () => {
    const { store, api } = bootTestSave({ game: dilemma(), savedAt: now - GAME_MAX_AGE_MS - 1 });
    expect(store.get()).toMatchObject({ game: null, issues: [] });
    expect(api.raw('game')).toBeNull();
  });

  it('a corrupt profile surfaces as an issue, which the UI can dismiss', () => {
    const { store, api } = bootTestSave({ raw: { [STORAGE_KEYS.profile]: 'garbage' } });
    expect(store.get().issues).toEqual(['profileReset']);
    store.dismissIssue('profileReset');
    expect(store.get().issues).toEqual([]);
    store.updateSettings({ sound: false }); // the main key may be written now: the raw copy is safe
    expect(api.raw('profile')).not.toBe('garbage');
    expectSynced(store, api);
  });

  it('recover runs once: a second call changes nothing', () => {
    const game = dilemma();
    const { store } = bootTestSave({ game });
    store.quitGame();
    store.recover(() => true);
    expect(store.get().game).toBeNull();
  });
});

describe('save store — failing writes', () => {
  it('write N throws → status failing, memory ahead; the next action re-sends it → synced, ok', () => {
    const { store, api } = bootTestSave();
    store.startGame(dilemma());
    failNext(api, 2);
    store.updateGame((g) => step(g, { type: 'next' }));
    expect(store.get().status).toBe('failing');
    expect(store.get().game?.step.kind).toBe('resolve'); // play goes on in memory
    store.updateSettings({ sound: false }); // fails too (2nd), game still dirty
    expect(store.get().status).toBe('failing');
    store.updateSettings({ vibration: false }); // storage is back: every dirty key is re-sent
    expect(store.get().status).toBe('ok');
    expectSynced(store, api);
  });

  it('retry() re-sends dirty keys (page hidden, banner Retry)', () => {
    const { store, api } = bootTestSave();
    failNext(api, 1);
    store.updateSettings({ lang: 'en' });
    expect(store.get().status).toBe('failing');
    store.retry();
    expect(store.get().status).toBe('ok');
    expectSynced(store, api);
  });

  it('a failed removal at finish is retried as a removal, never as a re-write of the final game', () => {
    const { store, api } = bootTestSave();
    store.startGame(dilemma());
    const { next } = store.updateGame(toFinal);
    vi.spyOn(api, 'remove').mockImplementationOnce(() => {
      throw new Error('locked');
    });
    store.finishGame(next!);
    expect(store.get().status).toBe('failing');
    store.retry();
    expect(api.raw('game')).toBeNull();
    expect(store.get().status).toBe('ok');
    expectSynced(store, api);
  });

  it('finish: when the profile write fails, the final game stays stored (boot could still replay it)', () => {
    const { store, api } = bootTestSave();
    store.startGame(dilemma());
    const { next } = store.updateGame(toFinal);
    failNext(api, 1); // the profile write
    store.finishGame(next!);
    expect(store.get().status).toBe('failing');
    expect(api.raw('game')).not.toBeNull();
    store.retry();
    expect(api.raw('game')).toBeNull();
    expect(store.get().status).toBe('ok');
    expectSynced(store, api);
  });

  it('in development a write that does not read back the same throws', () => {
    const { store, api } = bootTestSave();
    vi.spyOn(api, 'raw').mockReturnValue(null);
    expect(() => store.updateSettings({ sound: false })).toThrow('read back differs');
  });
});

describe('save store — memory status (storage off, or a newer save)', () => {
  it('a downgrade never writes anything, through a whole game and a settings change', () => {
    const storage = seedStorage({ raw: { [STORAGE_KEYS.profile]: JSON.stringify({ v: 9, savedAt: 1, data: { future: true } }) } });
    const setItem = vi.spyOn(storage, 'setItem');
    const removeItem = vi.spyOn(storage, 'removeItem');
    const api = createSaveMemoryApi(storage);
    const store = createSaveStore(api, api.load());
    store.recover(() => true);
    expect(store.get().status).toBe('memory');

    store.startGame(dilemma());
    const { next } = store.updateGame(toFinal);
    store.finishGame(next!);
    store.updateSettings({ lang: 'es' });
    store.retry();
    expect(store.get()).toMatchObject({ status: 'memory', profile: { settings: { lang: 'es' }, seenIds: [7] } });
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('a session without storage starts in memory status', () => {
    const api = createSaveMemoryApi();
    const store = createSaveStore(api, { ...api.load(), persistent: false });
    expect(store.get().status).toBe('memory');
  });
});
