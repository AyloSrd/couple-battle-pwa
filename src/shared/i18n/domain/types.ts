import type { fr } from '@/data/strings.fr';

/** The two shipped locales. FR is primary and the fallback. */
export const Lang = { Fr: 'fr', En: 'en' } as const;
export type TLang = (typeof Lang)[keyof typeof Lang];

/**
 * Every UI string key. Derived from the FR dictionary, so a key that does not
 * exist is a compile error at every call site (`useT('typo.key')` won't build).
 */
export type TStringKey = keyof typeof fr;

/** Values injected into `{placeholder}` slots. */
export type TStringVars = Record<string, string | number>;
