import type { fr } from '@/data/strings.fr';

/** The shipped locales. FR is primary and the fallback. */
export const Lang = { Fr: 'fr', En: 'en', Es: 'es' } as const;
export type TLang = (typeof Lang)[keyof typeof Lang];

/** Every shipped locale, in menu order. */
export const LANGS: readonly TLang[] = Object.values(Lang);

/** Each language's own name (endonym) — shown as-is in every UI language. */
export const LANG_NAMES: Record<TLang, string> = { fr: 'Français', en: 'English', es: 'Español' };

/**
 * Every UI string key. Derived from the FR dictionary, so a key that does not
 * exist is a compile error at every call site (`useT('typo.key')` won't build).
 */
export type TStringKey = keyof typeof fr;

/** Values injected into `{placeholder}` slots. */
export type TStringVars = Record<string, string | number>;
