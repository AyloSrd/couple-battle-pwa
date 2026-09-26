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
 *
 * Bounds are set just above what a real game can produce, so they reject a
 * tampered/corrupt record (which then self-heals away on read) without ever
 * rejecting a real machine state:
 *  - deck ≤ 64 (largest real draw: Ultime with 4 couples = 4 + 5 + 4×5 = 29);
 *  - secretAnswers keys are `answerKey(teamId, questionId)` (e.g. `t4|1035`),
 *    values are typed answers (input `maxLength` 40), yes/no, or a player name;
 *  - scores are keyed by roster teamIds (`t1`..`t4`);
 *  - cursor: coupleIdx indexes the roster, round ≤ 3 (Ultime's last round),
 *    questionIdx ≤ 64. `questionIdx < deck.length` is deliberately NOT checked:
 *    a short draw (small pool) legitimately runs past the deck.
 */
export const ZGameSnapshotSchema = z.object({
  roster: ZRosterSchema,
  mode: ZModeSchema,
  difficulty: ZGameDifficultySchema,
  themes: z.array(ZThemeIdSchema),
  deck: z.array(ZQuestionSchema).max(64),
  cursor: ZCursorSchema,
  scores: z.record(z.string().regex(/^t[1-4]$/), z.number().int()),
  secretAnswers: z.record(z.string().max(32), z.string().max(40)),
  // Dilemma resolve: per-couple match/miss for the current question (so a
  // mid-resolve refresh restores the confirmed couples' badges).
  confirmed: z.record(z.string(), z.enum(['match', 'miss'])).default({}),
  // Epoch ms of the write. A snapshot older than the resume window (or dated
  // implausibly in the future) is dropped on read — see `isSnapshotStale`.
  // Required: a pre-`savedAt` record fails the schema and self-heals away.
  savedAt: z.number().int().nonnegative(),
}).superRefine((s, ctx) => {
  if (s.cursor.coupleIdx >= s.roster.length) {
    ctx.addIssue({ code: 'custom', path: ['cursor', 'coupleIdx'], message: 'coupleIdx out of roster range' });
  }
  if (s.cursor.round > 3) {
    ctx.addIssue({ code: 'custom', path: ['cursor', 'round'], message: 'round out of range' });
  }
  if (s.cursor.questionIdx > 64) {
    ctx.addIssue({ code: 'custom', path: ['cursor', 'questionIdx'], message: 'questionIdx out of range' });
  }
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
