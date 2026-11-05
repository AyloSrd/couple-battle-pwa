import { newGame, type TNewGameConfig } from '@/shared/game/domain/game';
import type { TGameSnapshot } from './types';

/**
 * The initial snapshot for a new game: `newGame` (everyone at zero, first step of the plan)
 * stamped with the write time. The hand-off between the setup flow (which draws the deck and
 * writes this) and Play (which resumes `snapshot.game`).
 */
export function newGameSnapshot(config: TNewGameConfig, now: number = Date.now()): TGameSnapshot {
  return { game: newGame(config), savedAt: now };
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
