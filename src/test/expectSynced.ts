import { expect } from 'vitest';
import { decode, defaultProfile, type TSaveApi, type TSaveStore } from '@/shared/save';
import { encode } from '@/shared/save/domain/codec';
import { createMemoryStorage, createSaveMemoryApi } from '@/shared/save/api/memory';
import { STORAGE_KEYS } from '@/shared/save/api/localStorage';
import { createSaveStore } from '@/shared/save/application/store';
import type { TGame } from '@/shared/game';
import type { TProfile } from '@/shared/save';

/**
 * The save store's contract (ARCHITECTURE "Data safety"): what storage holds decodes to exactly
 * what the store shows. A missing profile reads as defaults; a finished (final) game is no
 * longer stored. Call it after every action.
 */
export function expectSynced(store: TSaveStore, api: TSaveApi): void {
  const { profile, game } = store.get();
  const storedProfile = decode('profile', api.raw('profile'));
  expect(storedProfile.kind === 'ok' ? storedProfile.data : storedProfile.kind === 'missing' ? defaultProfile() : storedProfile).toEqual(
    profile,
  );
  const storedGame = decode('game', api.raw('game'));
  expect(storedGame.kind === 'ok' ? storedGame.data : storedGame.kind === 'missing' ? null : storedGame).toEqual(
    game?.step.kind === 'final' ? null : game,
  );
}

type TSeed = { profile?: Partial<TProfile>; game?: TGame; savedAt?: number; raw?: Record<string, string> };

/** Memory storage holding encoded values, as a previous session would have left them. */
export function seedStorage({ profile, game, savedAt = Date.now(), raw = {} }: TSeed = {}) {
  const items: Record<string, string> = { ...raw };
  if (profile) items[STORAGE_KEYS.profile] = encode('profile', { ...defaultProfile(), ...profile }, savedAt);
  if (game) items[STORAGE_KEYS.game] = encode('game', game, savedAt);
  return createMemoryStorage(items);
}

/** Boot a store the way the app does (load → store → recover) over memory storage. */
export function bootTestSave(seed: TSeed = {}, hasQuestion: (id: number) => boolean = () => true) {
  const storage = seedStorage(seed);
  const api = createSaveMemoryApi(storage);
  const store = createSaveStore(api, api.load());
  store.recover(hasQuestion);
  return { storage, api, store };
}
