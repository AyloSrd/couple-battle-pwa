import type { TRoster, TMode, TGameDifficulty, TThemeId } from '@/shared/game/domain/types';
import type { TQuestion } from '@/shared/questions/domain/types';
import type { TGameSnapshot } from './types';

export type TNewGameConfig = {
  roster: TRoster;
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  deck: TQuestion[];
};

/**
 * Build the initial snapshot for a new game (everyone at zero, first question).
 * This is the hand-off contract between the setup flow (which draws the deck and
 * writes this) and the Play machine (which reads it via `fromSnapshot`).
 */
export function newGameSnapshot(config: TNewGameConfig): TGameSnapshot {
  const scores: Record<string, number> = {};
  for (const team of config.roster) scores[team.teamId] = 0;
  // Opening phase per mode (must match the machine's initGame).
  const phase = config.mode === 'flash' ? 'passSecret' : 'question';
  return {
    roster: config.roster,
    mode: config.mode,
    difficulty: config.difficulty,
    themes: config.themes,
    deck: config.deck,
    cursor: { phase, round: 0, coupleIdx: 0, questionIdx: 0 },
    scores,
    secretAnswers: {},
    confirmed: {},
  };
}
