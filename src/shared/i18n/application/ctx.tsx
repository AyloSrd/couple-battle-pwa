import { createContext, useContext, useEffect, type FC, type PropsWithChildren } from 'react';
import { fr } from '@/data/strings.fr';
import { en } from '@/data/strings.en';
import { es } from '@/data/strings.es';
import { interpolate } from '../domain/services';
import { Lang, type TLang, type TStringKey, type TStringVars } from '../domain/types';

const DICTS: Record<TLang, Record<TStringKey, string>> = { fr, en, es };

type TLangContext = {
  lang: TLang;
  setLang: (lang: TLang) => void;
};

const LangCtx = createContext<TLangContext | null>(null);

type TLangProviderProps = PropsWithChildren<{
  /** The active language: the shell passes `settings.lang` from the save store. */
  lang: TLang;
  /** A screen picked another language — the shell saves it (and `lang` follows). */
  onLangChange?: (lang: TLang) => void;
}>;

/**
 * Controlled: the language has one owner (the saved settings), so there is no copy to drift.
 * i18n never depends on the save store; the shell wires the two.
 */
export const LangProvider: FC<TLangProviderProps> = ({ lang, onLangChange, children }) => {
  // Keep <html lang> in sync for screen readers / correct hyphenation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: TLang) => {
    if (next !== lang) onLangChange?.(next);
  };

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
};

export function useLang(): TLangContext {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error('LangProvider not found in tree');
  return ctx;
}

/** Translate function. Wrong keys are compile errors; FR is the fallback. */
export type TFunc = (key: TStringKey, vars?: TStringVars) => string;

export function useT(): TFunc {
  const { lang } = useLang();
  return (key, vars) => {
    const value = DICTS[lang][key] ?? DICTS[Lang.Fr][key];
    return interpolate(value, vars);
  };
}
