import { z } from 'zod';
import {
  ZModeSchema,
  ZGameDifficultySchema,
  ZThemeIdSchema,
  ZRosterSchema,
} from '@/shared/game/domain/types';
import { ZQuestionSchema } from '@/shared/questions/domain/types';
import { Lang } from '@/shared/i18n/domain/types';

/** User settings. */
export const ZSettingsSchema = z.object({
  lang: z.enum([Lang.Fr, Lang.En]),
  sound: z.boolean(),
});
export type TSettings = z.infer<typeof ZSettingsSchema>;

/** Global set of already-seen question ids (language-independent). */
export const ZSeenQuestionIdsSchema = z.array(z.number().int().positive());
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
 * Where we are inside a running game. `phase` is left as a string here — the
 * Play machine (Phase 2) owns the canonical phase union and maps its in-memory
 * state to/from this persisted snapshot.
 */
export const ZCursorSchema = z.object({
  phase: z.string(),
  round: z.number().int().nonnegative(),
  coupleIdx: z.number().int().nonnegative(),
  questionIdx: z.number().int().nonnegative(),
});
export type TCursor = z.infer<typeof ZCursorSchema>;

/**
 * Full session state, written on every transition and cleared on game end.
 * Powers crash/refresh resume (views-spec §2).
 */
export const ZGameSnapshotSchema = z.object({
  roster: ZRosterSchema,
  mode: ZModeSchema,
  difficulty: ZGameDifficultySchema,
  themes: z.array(ZThemeIdSchema),
  deck: z.array(ZQuestionSchema),
  cursor: ZCursorSchema,
  scores: z.record(z.string(), z.number().int()),
  secretAnswers: z.record(z.string(), z.string()),
});
export type TGameSnapshot = z.infer<typeof ZGameSnapshotSchema>;

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
  settings: { lang: Lang.Fr, sound: true },
  seenQuestionIds: [],
  guidelinesSeen: { flash: false, dilemma: false, ultime: false },
  soloBest: { flash: 0, dilemma: 0, ultime: 0 },
  gameSnapshot: null,
};
