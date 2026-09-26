import { z } from 'zod';

/** Game modes. */
export const Mode = { Flash: 'flash', Dilemma: 'dilemma', Ultime: 'ultime' } as const;
export type TMode = (typeof Mode)[keyof typeof Mode];
export const ZModeSchema = z.enum(['flash', 'dilemma', 'ultime']);

/** Difficulty as SELECTED (includes `mix` = all). Distinct from a question's own difficulty. */
export const GameDifficulty = {
  Mix: 'mix',
  Easy: 'easy',
  Medium: 'medium',
  Hard: 'hard',
} as const;
export type TGameDifficulty = (typeof GameDifficulty)[keyof typeof GameDifficulty];
export const ZGameDifficultySchema = z.enum(['mix', 'easy', 'medium', 'hard']);

/** The 12 theme ids — match the question `theme` field and the `theme.*` string keys. */
export const THEME_IDS = [
  'homeDaily',
  'foodDrinks',
  'travel',
  'workAmbition',
  'hobbies',
  'goingOut',
  'money',
  'childhood',
  'personality',
  'dreams',
  'loveIntimacy',
  'random',
] as const;
export type TThemeId = (typeof THEME_IDS)[number];
export const ZThemeIdSchema = z.enum(THEME_IDS);

/** The canonical 12 team avatars (single registry — every team list derives
 *  from this). Left partner wears the bow (design note). */
export const AVATAR_IDS = [
  'penguins',
  'otters',
  'lions',
  'pandas',
  'foxes',
  'squirrels',
  'rabbits',
  'bears',
  'raccoons',
  'mice',
  'ermines',
  'owls',
] as const;
export type TAvatarId = (typeof AVATAR_IDS)[number];
export const ZAvatarIdSchema = z.enum(AVATAR_IDS);

/** A player's name as Setup produces it: trimmed, non-empty, ≤ 16 chars (the
 *  name inputs' `maxLength`). */
const ZPlayerNameSchema = z.string().trim().min(1).max(16);

/** One couple. `teamId` is stable within a game; scores are keyed by it.
 *  Setup assigns `t1`..`t4` in roster order (1–4 couples). */
export const ZTeamSchema = z.object({
  teamId: z.string().regex(/^t[1-4]$/),
  avatarId: ZAvatarIdSchema,
  players: z.tuple([ZPlayerNameSchema, ZPlayerNameSchema]),
});
export type TTeam = z.infer<typeof ZTeamSchema>;

/** 1–4 couples. */
export const ZRosterSchema = z.array(ZTeamSchema).min(1).max(4);
export type TRoster = z.infer<typeof ZRosterSchema>;
