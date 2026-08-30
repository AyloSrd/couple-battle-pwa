import type { TRoster, TMode, TGameDifficulty, TThemeId } from '@/shared/game/domain/types';

/**
 * The in-progress new-game selection, built across Setup → Mode → Difficulty
 * and consumed when the game starts. Not persisted — once the game begins it
 * becomes a `gameSnapshot` in save.
 */
export type TDraftGame = {
  roster: TRoster | null;
  mode: TMode | null;
  difficulty: TGameDifficulty | null;
  themes: TThemeId[];
};

export const EMPTY_DRAFT: TDraftGame = {
  roster: null,
  mode: null,
  difficulty: null,
  themes: [],
};
