import { z } from 'zod';
import { ZGameSchema, isGameConsistent, type TGame } from '@/shared/game/domain/game';
import { Lang } from '@/shared/i18n/domain/types';

export { ZHistoryEntrySchema, type THistoryEntry } from '@/shared/game/domain/game';

/**
 * User settings. `vibration` (haptics on the countdown) was added after launch: a save written
 * before it existed has no such field and must keep parsing — it defaults to on. A non-boolean
 * value also falls back to on, so one bad field never costs the player their language/sound
 * (the idb adapter would otherwise drop the whole settings record on a parse failure).
 */
export const ZSettingsSchema = z.object({
  lang: z.enum([Lang.Fr, Lang.En, Lang.Es]),
  sound: z.boolean(),
  vibration: z.boolean().catch(true),
});
export type TSettings = z.infer<typeof ZSettingsSchema>;

/** Global set of already-seen question ids (language-independent). Bounded well above
 *  the real pool (1,135 ids) so a tampered record cannot grow without limit. */
export const SEEN_QUESTION_IDS_MAX = 10_000;
export const ZSeenQuestionIdsSchema = z.array(z.number().int().positive()).max(SEEN_QUESTION_IDS_MAX);
export type TSeenQuestionIds = z.infer<typeof ZSeenQuestionIdsSchema>;

/** Which per-mode guideline screens the player has dismissed. */
export const ZGuidelinesSeenSchema = z.object({
  flash: z.boolean(),
  dilemma: z.boolean(),
  ultime: z.boolean(),
});
export type TGuidelinesSeen = z.infer<typeof ZGuidelinesSeenSchema>;

/** Best solo scores per mode. */
export const ZSoloBestSchema = z.object({
  flash: z.number().int().nonnegative(),
  dilemma: z.number().int().nonnegative(),
  ultime: z.number().int().nonnegative(),
});
export type TSoloBest = z.infer<typeof ZSoloBestSchema>;

/**
 * The running game, written on every transition and cleared on game end. Powers crash/refresh
 * resume (views-spec §2). The game itself is the shared `ZGameSchema` (bounds set just above
 * what a real game can produce, so a tampered record is rejected without ever rejecting a real
 * one); on top of the schema, a stored game must be consistent (indices inside the roster and
 * the plan, team ids from the roster), else it self-heals away on read like a corrupt one.
 *
 * TEMPORARY bridge (refactor R1): R2 replaces this key with the versioned `cb.game` envelope.
 * A record in the pre-redesign shape (cursor/phase + full-question deck) simply fails to parse.
 */
export const ZGameSnapshotSchema = z
  .object({
    game: ZGameSchema,
    // Epoch ms of the write. A snapshot older than the resume window (or dated implausibly in
    // the future) is dropped on read — see `isSnapshotStale`.
    savedAt: z.number().int().nonnegative(),
  })
  .refine((s) => isGameConsistent(s.game as TGame), { message: 'inconsistent game', path: ['game'] });
export type TGameSnapshot = { game: TGame; savedAt: number };

/**
 * The whole persisted save, one object store keyed by these names. Each key has
 * its own schema and default.
 */
export type TSaveShape = {
  settings: TSettings;
  seenQuestionIds: TSeenQuestionIds;
  guidelinesSeen: TGuidelinesSeen;
  soloBest: TSoloBest;
  gameSnapshot: TGameSnapshot | null;
};
export type TSaveKey = keyof TSaveShape;

/** Per-key validators, used by every adapter as data crosses the boundary. */
export const SAVE_SCHEMAS = {
  settings: ZSettingsSchema,
  seenQuestionIds: ZSeenQuestionIdsSchema,
  guidelinesSeen: ZGuidelinesSeenSchema,
  soloBest: ZSoloBestSchema,
  gameSnapshot: ZGameSnapshotSchema.nullable(),
} as const satisfies Record<TSaveKey, z.ZodType>;

/** Defaults returned when a key has never been written. */
export const SAVE_DEFAULTS: TSaveShape = {
  settings: { lang: Lang.Fr, sound: true, vibration: true },
  seenQuestionIds: [],
  guidelinesSeen: { flash: false, dilemma: false, ultime: false },
  soloBest: { flash: 0, dilemma: 0, ultime: 0 },
  gameSnapshot: null,
};
