import type { TGame, TMode } from '@/shared/game';
import type { TLoaded, TLoadedGame, TSaveApi } from '../api';
import { decode, sameData } from '../domain/codec';
import { mergeFinish, recoveryOf } from '../domain/services';
import type { TProfile, TSaveIssue, TSaveKey, TSettings, TSoloResult } from '../domain/types';

/** `memory`: nothing is written this session (storage off, or a newer save we must not touch). */
export type TSaveStatus = 'ok' | 'failing' | 'memory';

export type TSaveState = {
  profile: TProfile;
  /** The running game; after `finishGame` the final game stays here (Final screen, Rematch). */
  game: TGame | null;
  status: TSaveStatus;
  issues: TSaveIssue[];
};

export type TSaveStore = ReturnType<typeof createSaveStore>;

const KEY_ORDER: readonly TSaveKey[] = ['profile', 'game'];

/**
 * The single owner of persisted data (ARCHITECTURE "Data safety"). Every action computes the
 * next state, writes storage synchronously, THEN publishes: what the player sees is what a
 * relaunch reloads. A failed write marks its key dirty (status `failing`, memory goes on) and is
 * retried on the next action, when the page is hidden, or from the banner's Retry.
 */
export function createSaveStore(api: TSaveApi, loaded: TLoaded) {
  let state: TSaveState = {
    profile: loaded.profile,
    game: null, // installed by recover()
    status: loaded.persistent ? 'ok' : 'memory',
    issues: loaded.issues,
  };
  let pending: TLoadedGame = loaded.game;
  /** The game in memory is final and folded into the profile: storage must not hold it. */
  let finished = false;
  const dirty = new Set<TSaveKey>();
  const listeners = new Set<() => void>();

  const publish = (patch: Partial<TSaveState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const writeKey = (key: TSaveKey) => {
    if (key === 'profile') return api.write('profile', state.profile);
    if (state.game && !finished) return api.write('game', state.game);
    return api.remove('game');
  };

  /** Dev only: what storage now holds must decode to exactly what memory holds. */
  const assertReadBack = (key: TSaveKey) => {
    const decoded = decode(key, api.raw(key));
    const expected = key === 'profile' ? state.profile : finished ? null : state.game;
    const actual = decoded.kind === 'ok' ? decoded.data : null;
    if (!sameData(actual, expected)) throw new Error(`save: ${key} read back differs from memory`);
  };

  /** Write `keys` plus every dirty key; returns the status to publish. Never throws on storage. */
  const persist = (...keys: TSaveKey[]): TSaveStatus => {
    if (state.status === 'memory') return 'memory';
    keys.forEach((key) => dirty.add(key));
    // In order, profile before game, stopping at the first failure: a finish never removes the
    // final game before its profile merge is stored (boot can still replay it).
    for (const key of KEY_ORDER.filter((k) => dirty.has(k))) {
      try {
        writeKey(key);
      } catch {
        break; // this key and the ones after it stay dirty: retried by the next action
      }
      dirty.delete(key);
      if (import.meta.env.DEV) assertReadBack(key);
    }
    return dirty.size > 0 ? 'failing' : 'ok';
  };

  /** Commit a change: memory → storage → publish, in this tick. */
  const commit = (patch: Partial<TSaveState>, ...keys: TSaveKey[]) => {
    state = { ...state, ...patch };
    publish({ status: persist(...keys) });
  };

  const setProfile = (profile: TProfile) => commit({ profile }, 'profile');

  const dropGame = () => {
    finished = false;
    commit({ game: null }, 'game');
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => state,

    /** Apply a pure transition. Same object back (an illegal or stale event) → no write, no render. */
    updateGame(fn: (game: TGame) => TGame): { changed: boolean; next: TGame | null } {
      const current = state.game;
      if (!current || finished) return { changed: false, next: current };
      const next = fn(current);
      if (next === current) return { changed: false, next };
      commit({ game: next }, 'game');
      return { changed: true, next };
    },
    /** Synchronous, so a double tap on Start cannot race a second game in. */
    startGame(game: TGame) {
      finished = false;
      commit({ game }, 'game');
    },
    /** Fold a final game into the profile; memory keeps it for the Final screen and Rematch. */
    finishGame(final: TGame): TSoloResult | null {
      if (finished || state.game !== final || final.step.kind !== 'final') return null;
      const { profile, soloResult } = mergeFinish(state.profile, final);
      finished = true;
      // the final game is already stored; profile, then removal: a crash in between replays
      commit({ profile }, 'profile', 'game');
      return soloResult;
    },
    /** Throw the running game away (pause → Quit, Home → New game, Play's crash screen). */
    quitGame: dropGame,
    /** Leave a finished game (Rematch, New game): only a final game is cleared. */
    leaveGame() {
      if (state.game?.step.kind === 'final') dropGame();
    },
    updateSettings(patch: Partial<TSettings>) {
      const settings = { ...state.profile.settings, ...patch };
      if (sameData(settings, state.profile.settings)) return;
      setProfile({ ...state.profile, settings });
    },
    markGuidelineSeen(mode: TMode) {
      if (state.profile.guidelinesSeen[mode]) return;
      setProfile({ ...state.profile, guidelinesSeen: { ...state.profile.guidelinesSeen, [mode]: true } });
    },
    resetSeenIds() {
      setProfile({ ...state.profile, seenIds: [] });
    },
    dismissIssue(issue: TSaveIssue) {
      if (state.issues.includes(issue)) publish({ issues: state.issues.filter((i) => i !== issue) });
    },

    /**
     * Boot, once: decide what to do with the game storage held. A final game is replayed first
     * (its profile merge may not have landed); a stale one is removed quietly; an invalid or
     * inconsistent one is removed and the player is told; anything else resumes.
     */
    recover(hasQuestion: (id: number) => boolean, now: number = Date.now()) {
      const loadedGame = pending;
      pending = null;
      if (loadedGame === null) return;
      if (loadedGame === 'invalid') {
        commit({ issues: [...state.issues, 'gameDiscarded'] }, 'game');
        return;
      }
      const { game, savedAt } = loadedGame;
      switch (recoveryOf(game, savedAt, { now, hasQuestion })) {
        case 'finish':
          // replay the merge; nothing to show (that game's Final screen is gone with the crash)
          commit({ profile: mergeFinish(state.profile, game).profile }, 'profile', 'game');
          return;
        case 'stale':
          commit({}, 'game');
          return;
        case 'discard':
          commit({ issues: [...state.issues, 'gameDiscarded'] }, 'game');
          return;
        case 'resume':
          state = { ...state, game }; // already in storage as-is: nothing to write
          publish({});
          return;
      }
    },

    /** Re-send every dirty key (page hidden, banner Retry). */
    retry() {
      if (dirty.size === 0) return;
      publish({ status: persist() });
    },
  };
}
