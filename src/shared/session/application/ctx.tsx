import {
  createContext,
  useContext,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import type { TRoster, TMode, TGameDifficulty, TThemeId } from '@/shared/game';
import { EMPTY_DRAFT, type TDraftGame } from '../domain/types';

type TDraftGameContext = {
  draft: TDraftGame;
  setRoster: (roster: TRoster) => void;
  setMode: (mode: TMode) => void;
  setDifficulty: (difficulty: TGameDifficulty) => void;
  setThemes: (themes: TThemeId[]) => void;
  reset: () => void;
};

const DraftGameCtx = createContext<TDraftGameContext | null>(null);

/** Holds the new-game selection while the player moves through the setup flow. */
export const DraftGameProvider: FC<PropsWithChildren> = ({ children }) => {
  const [draft, setDraft] = useState<TDraftGame>(EMPTY_DRAFT);

  const value: TDraftGameContext = {
    draft,
    setRoster: (roster) => setDraft((d) => ({ ...d, roster })),
    setMode: (mode) => setDraft((d) => ({ ...d, mode })),
    setDifficulty: (difficulty) => setDraft((d) => ({ ...d, difficulty })),
    setThemes: (themes) => setDraft((d) => ({ ...d, themes })),
    reset: () => setDraft(EMPTY_DRAFT),
  };

  return <DraftGameCtx.Provider value={value}>{children}</DraftGameCtx.Provider>;
};

export function useDraftGame(): TDraftGameContext {
  const ctx = useContext(DraftGameCtx);
  if (!ctx) throw new Error('DraftGameProvider not found in tree');
  return ctx;
}
