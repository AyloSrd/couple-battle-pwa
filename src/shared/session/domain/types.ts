import type { TRoster, TMode } from '@/shared/game/domain/types';

/**
 * The new-game selection carried across Setup → Mode → Difficulty, memory only (never
 * persisted). Setup seeds its wizard from `roster`, so Back from Mode keeps every name; Rematch
 * fills it from the finished game.
 */
export type TDraft = {
  roster: TRoster | null;
  mode: TMode | null;
};

export const EMPTY_DRAFT: TDraft = { roster: null, mode: null };
