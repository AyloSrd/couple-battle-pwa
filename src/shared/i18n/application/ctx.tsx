import {
  createContext,
  useContext,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import { fr } from '@/data/strings.fr';
import { en } from '@/data/strings.en';
import { interpolate } from '../domain/services';
import { Lang, type TLang, type TStringKey, type TStringVars } from '../domain/types';

const DICTS: Record<TLang, Record<TStringKey, string>> = { fr, en };

type TLangContext = {
  lang: TLang;
  setLang: (lang: TLang) => void;
};

const LangCtx = createContext<TLangContext | null>(null);

type TLangProviderProps = PropsWithChildren<{
  /** Initial language (seeded from persisted settings). */
  initialLang: TLang;
  /** Called whenever the language changes — the shell persists it to settings. */
  onLangChange?: (lang: TLang) => void;
}>;

/**
 * Holds the active language in memory. Seeding from and persisting to settings
 * is the shell's job (via `initialLang` / `onLangChange`), so i18n never depends
 * on the save port.
 */
export const LangProvider: FC<TLangProviderProps> = ({
  initialLang,
  onLangChange,
  children,
}) => {
  const [lang, setLangState] = useState<TLang>(initialLang);

  const setLang = (next: TLang) => {
    setLangState(next);
    onLangChange?.(next);
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
