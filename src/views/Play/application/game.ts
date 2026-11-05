import { useState } from 'react';
import type { TGame, THistoryEntry } from '@/shared/game';
import { selectGame, useSave, useSaveStore, type TSoloResult } from '@/shared/save';
import type { TQuestion } from '@/shared/questions';
import { reduce, type TGameAt, type TGameEventBody } from '../domain/machine';

/** What a screen sends the game: the event body; `useGame` adds the `seq`. */
export type TDispatch = (event: TGameEventBody) => void;

/** A game screen: its step, the card's text in the active language, the game's dispatch. */
export type TScreenProps<K extends TGame['step']['kind']> = { game: TGameAt<K>; question: TQuestion | undefined; dispatch: TDispatch };

/** The last scoring verdict this session, for the "+N" pop; `id` grows with every score. */
export type TScorePop = { id: number; entry: THistoryEntry };

/**
 * The only Play code touching save. `dispatch` attaches the `seq` of the game THIS render showed,
 * so a double tap or a late timer is ignored by the reducer (same object: no write, no render).
 * The changed transition to `final` finishes the game once (keeping the solo line); one that
 * scored points sets `scorePop` (UI only, never saved).
 */
export function useGame() {
  const store = useSaveStore();
  const game = useSave(selectGame);
  const [soloResult, setSoloResult] = useState<TSoloResult | null>(null);
  const [scorePop, setScorePop] = useState<TScorePop | null>(null);
  const dispatch: TDispatch = (event) => {
    if (!game) return; // a timer firing after quit
    const seq = game.ctx.seq;
    const result = store.updateGame((current) => reduce(current, { ...event, seq }));
    if (!result.changed || !result.next) return;
    const { history } = result.next.ctx;
    const entry = history.length > game.ctx.history.length ? history.at(-1) : undefined;
    if (entry && entry.points > 0) setScorePop((pop) => ({ id: (pop?.id ?? 0) + 1, entry }));
    if (result.next.step.kind === 'final') setSoloResult(store.finishGame(result.next));
  };
  return { game, dispatch, soloResult, scorePop };
}
