import { useState } from 'react';
import { selectGame, useSave, useSaveStore, type TSoloResult } from '@/shared/save';
import { reduce, type TGameEventBody } from '../domain/machine';

/**
 * The only Play code touching save. `game` is the stored reference (never copied into state);
 * `dispatch` attaches the `seq` of the game THIS render showed, so a double tap or a late timer
 * is ignored by the reducer (same object → no write, no render). The changed transition to
 * `final` finishes the game once and keeps the solo line for the Final screen.
 */
export function useGame() {
  const store = useSaveStore();
  const game = useSave(selectGame);
  const [soloResult, setSoloResult] = useState<TSoloResult | null>(null);

  const dispatch = (event: TGameEventBody) => {
    if (!game) return; // a timer firing after quit
    const seq = game.ctx.seq;
    const result = store.updateGame((current) => reduce(current, { ...event, seq }));
    if (result.changed && result.next?.step.kind === 'final') setSoloResult(store.finishGame(result.next));
  };

  return { game, dispatch, soloResult };
}
