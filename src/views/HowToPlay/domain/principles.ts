import type { TStringKey } from '@/shared/i18n/domain/types';

/** One "how the evening works" card. `badge` is the emoji in its round disc; `null` = the card draws its own visual. */
export type TPrinciple = {
  id: 'phone' | 'split' | 'roles' | 'win';
  badge: string | null;
  title: TStringKey;
  body: TStringKey;
};

/**
 * The four principles shown above the modes, in reading order. Pure data: the page renders it,
 * and the test checks every key exists in the four languages.
 */
export const PRINCIPLES = [
  { id: 'phone', badge: '📱', title: 'howto.principles.phone.title', body: 'howto.principles.phone.body' },
  { id: 'split', badge: null, title: 'howto.principles.split.title', body: 'howto.principles.split.body' },
  { id: 'roles', badge: '🙈', title: 'howto.principles.roles.title', body: 'howto.principles.roles.body' },
  { id: 'win', badge: '👑', title: 'howto.principles.win.title', body: 'howto.principles.win.body' },
] as const satisfies readonly TPrinciple[];
