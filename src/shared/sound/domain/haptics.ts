import type { TSoundId } from './types';

/** A `navigator.vibrate` pattern: one buzz (ms) or buzz / pause / buzz … */
export type THapticPattern = number | number[];

// The cue table's Haptic column (plan 4.8), tiny on purpose: 10–40 ms buzzes.
const SELECTION = 10; // any button
const LIGHT = 15; // answer locked
const MEDIUM = 25; // reveal
const SUCCESS = [15, 50, 30]; // exact, synchro
const WARNING = [30, 60, 15]; // close
const ERROR = [40, 40, 40]; // miss, mismatch, error

/**
 * Which cues buzz, keyed by the sound they ride on. Screen cues (whoosh, pass), the tally ticks
 * and the confetti stay still; the settings toggles give their own confirmation.
 */
const HAPTICS: Partial<Record<TSoundId, THapticPattern>> = {
  'sfx.tap': SELECTION,
  'sfx.back': SELECTION,
  'sfx.select': SELECTION,
  'sfx.lock': LIGHT,
  'sfx.reveal': MEDIUM,
  'sfx.point.exact': SUCCESS,
  'sfx.synchro': SUCCESS,
  'sfx.point.close': WARNING,
  'sfx.point.miss': ERROR,
  'sfx.mismatch': ERROR,
  'sfx.error': ERROR,
  // the countdown, as it always buzzed
  'sfx.countdown.tick': 50,
  'sfx.countdown.go': [60, 40, 60],
  // final: heavy, then success
  'mus.fanfare': [40, 80, 15, 50, 30],
};

/** The pattern a cue buzzes, or `null` (haptics off, or a cue that stays still). */
export function hapticFor(id: TSoundId, on: boolean): THapticPattern | null {
  return on ? (HAPTICS[id] ?? null) : null;
}
