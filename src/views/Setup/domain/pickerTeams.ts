import type { TAvatarId } from '@/shared/game/domain/types';

/**
 * The teams offered in the team picker — a view-level filter over the avatar registry
 * (`AVATAR_IDS` stays the full list): the six that have art delivered, so the whole
 * grid fits on one screen without scrolling.
 */
export const PICKER_TEAMS = [
  'penguins',
  'otters',
  'lions',
  'pandas',
  'foxes',
  'squirrels',
] as const satisfies readonly TAvatarId[];
