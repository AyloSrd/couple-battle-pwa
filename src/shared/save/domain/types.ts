import { z } from 'zod';
import { Lang } from '@/shared/i18n/domain/types';
import type { TGame } from '@/shared/game/domain/game';

/**
 * The persisted profile: everything about the player that outlives a game. Every field parses
 * with its own `.catch(default)`, so one bad field (an unknown language, a corrupt flag, a
 * stray id) resets only that field and never the whole profile (S2).
 */

const DEFAULT_SETTINGS = { lang: Lang.Fr, sound: true, vibration: true } as const;

/** `vibration` (haptics on the countdown) was added after launch: a save without it reads as on. */
export const ZSettingsSchema = z
  .object({
    lang: z.enum([Lang.Fr, Lang.En, Lang.Es]).catch(DEFAULT_SETTINGS.lang),
    sound: z.boolean().catch(DEFAULT_SETTINGS.sound),
    vibration: z.boolean().catch(DEFAULT_SETTINGS.vibration),
  })
  .catch({ ...DEFAULT_SETTINGS });
export type TSettings = z.infer<typeof ZSettingsSchema>;

/** Bound well above the real pool (1,135 ids) so a tampered record cannot grow without limit. */
export const SEEN_IDS_MAX = 10_000;
const isQuestionId = (id: unknown): id is number => Number.isInteger(id) && (id as number) > 0;
/** Already-seen question ids (language-independent). An invalid id is dropped, the rest kept. */
export const ZSeenIdsSchema = z
  .array(z.unknown())
  .max(SEEN_IDS_MAX)
  .transform((ids) => [...new Set(ids.filter(isQuestionId))])
  .catch([]);

const flag = z.boolean().catch(false);
/** Which per-mode guideline screens the player has dismissed. */
export const ZGuidelinesSeenSchema = z
  .object({ flash: flag, dilemma: flag, ultime: flag })
  .catch({ flash: false, dilemma: false, ultime: false });
export type TGuidelinesSeen = z.infer<typeof ZGuidelinesSeenSchema>;

const best = z.number().int().nonnegative().catch(0);
/** Best solo score per mode. */
export const ZSoloBestSchema = z
  .object({ flash: best, dilemma: best, ultime: best })
  .catch({ flash: 0, dilemma: 0, ultime: 0 });
export type TSoloBest = z.infer<typeof ZSoloBestSchema>;

export const ZProfileSchema = z.object({
  settings: ZSettingsSchema,
  seenIds: ZSeenIdsSchema,
  guidelinesSeen: ZGuidelinesSeenSchema,
  soloBest: ZSoloBestSchema,
});
export type TProfile = {
  settings: TSettings;
  seenIds: number[];
  guidelinesSeen: TGuidelinesSeen;
  soloBest: TSoloBest;
};

/** A fresh profile (nothing saved yet). A new object each call: callers may keep it as state. */
export function defaultProfile(): TProfile {
  return {
    settings: { ...DEFAULT_SETTINGS },
    seenIds: [],
    guidelinesSeen: { flash: false, dilemma: false, ultime: false },
    soloBest: { flash: 0, dilemma: 0, ultime: 0 },
  };
}

/** The two persisted values. `profile` → storage key `cb.profile`, `game` → `cb.game`. */
export type TSaveValues = { profile: TProfile; game: TGame };
export type TSaveKey = keyof TSaveValues;

/** Something the player must be told about after boot. */
export type TSaveIssue = 'profileReset' | 'gameDiscarded';

/** The Final screen's solo line, computed from the best read BEFORE the merge. */
export type TSoloResult = { isBest: boolean; points: number; best: number };
