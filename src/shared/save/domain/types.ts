import { z } from 'zod';
import { Lang } from '@/shared/i18n/domain/types';
import type { TGame } from '@/shared/game/domain/game';

/**
 * The persisted profile: everything about the player that outlives a game. Every field parses
 * with its own `.catch(default)`, so one bad field (an unknown language, a corrupt flag, a
 * stray id) resets only that field and never the whole profile (S2).
 */

/** An object whose fields fall back one by one; a non-object reads as all defaults. */
const lenient = <S extends z.ZodRawShape>(shape: S) => z.object(shape).catch(() => z.object(shape).parse({}));

/** `vibration` (haptics on the countdown) was added after launch: a save without it reads as on. */
export const ZSettingsSchema = lenient({
  lang: z.enum([Lang.Fr, Lang.En, Lang.Es]).catch(Lang.Fr),
  sound: z.boolean().catch(true),
  vibration: z.boolean().catch(true),
});
export type TSettings = z.infer<typeof ZSettingsSchema>;

/** Bound well above the real pool (1,135 ids) so a tampered record cannot grow without limit. */
export const SEEN_IDS_MAX = 10_000;
const isQuestionId = (id: unknown): id is number => Number.isInteger(id) && (id as number) > 0;
const flag = z.boolean().catch(false);
const best = z.number().int().nonnegative().catch(0);

export const ZProfileSchema = z.object({
  settings: ZSettingsSchema,
  /** Already-seen question ids (language-independent). An invalid id is dropped, the rest kept. */
  seenIds: z
    .array(z.unknown())
    .max(SEEN_IDS_MAX)
    .transform((ids) => [...new Set(ids.filter(isQuestionId))])
    .catch(() => []),
  /** Which per-mode guideline screens the player has dismissed. */
  guidelinesSeen: lenient({ flash: flag, dilemma: flag, ultime: flag }),
  /** Best solo score per mode. */
  soloBest: lenient({ flash: best, dilemma: best, ultime: best }),
});
export type TProfile = z.infer<typeof ZProfileSchema>;

/** A fresh profile (nothing saved yet): every field at its default, new objects each call. */
export const defaultProfile = (): TProfile => ZProfileSchema.parse({});

/** The two persisted values. `profile` → storage key `cb.profile`, `game` → `cb.game`. */
export type TSaveValues = { profile: TProfile; game: TGame };
export type TSaveKey = keyof TSaveValues;

/** Something the player must be told about after boot. */
export type TSaveIssue = 'profileReset' | 'gameDiscarded';

/** The Final screen's solo line, computed from the best read BEFORE the merge. */
export type TSoloResult = { isBest: boolean; points: number; best: number };
