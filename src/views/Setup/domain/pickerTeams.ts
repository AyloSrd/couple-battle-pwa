import type { TAvatarId } from '@/shared/game/domain/types';

/**
 * The teams offered in the team picker — a view-level filter over the avatar registry
 * (`AVATAR_IDS` stays the full list): exactly the six that have the current art set
 * delivered (portrait, full body, both busts), in registry order, so the whole grid
 * fits on one screen without scrolling.
 */
export const PICKER_TEAMS = [
  'otters',
  'lions',
  'foxes',
  'squirrels',
  'raccoons',
  'mice',
] as const satisfies readonly TAvatarId[];
