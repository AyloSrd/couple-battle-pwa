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
export function newGameSnapshot(config: TNewGameConfig, now: number = Date.now()): TGameSnapshot {
  const scores: Record<string, number> = {};
  for (const team of config.roster) scores[team.teamId] = 0;
  // Opening phase per mode (must match the machine's initGame): Flash AND
  // Ultime both open on the shared-Flash answerers' gate.
  const phase = config.mode === 'dilemma' ? 'question' : 'sideAnswerers';
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
    savedAt: now,
  };
}

/** How long an in-progress game stays resumable after its last write. */
export const SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
/** Clock-skew tolerance for a snapshot dated in the future. */
export const SNAPSHOT_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

/**
 * A snapshot is stale — and must not be resumed — once it is older than
 * `SNAPSHOT_MAX_AGE_MS`, or when it claims to be from further in the future
 * than `SNAPSHOT_MAX_FUTURE_SKEW_MS` (a tampered or skewed clock). This bounds
 * how long a Flash round's locked secret answers can sit on the device.
 */
export function isSnapshotStale(s: TGameSnapshot, now: number): boolean {
  return now - s.savedAt > SNAPSHOT_MAX_AGE_MS || s.savedAt > now + SNAPSHOT_MAX_FUTURE_SKEW_MS;
}
