import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import type { TGameAt } from '../domain/machine';
import { FinalScreen } from './FinalScreen';

const roster = [
  { teamId: 't1', avatarId: 'lions', players: ['Ana', 'Bob'] },
  { teamId: 't2', avatarId: 'bears', players: ['Cleo', 'Dan'] },
] as const;

const game = {
  ctx: {
    roster: roster.map((r) => ({ ...r, players: [...r.players] as [string, string] })),
    mode: 'dilemma',
    difficulty: 'easy',
    themes: [],
    deck: [],
    scores: { t1: 3, t2: 3 },
    history: [
      { teamId: 't1', stage: 'dilemma', round: 0, points: 1, max: 1 },
      { teamId: 't2', stage: 'dilemma', round: 0, points: 0, max: 1 },
    ],
    seg: 0,
    seq: 20,
  },
  step: { kind: 'final' },
} as unknown as TGameAt<'final'>;

/** Per-event add/remove counts. React DOM registers one permanent `selectionchange`
 *  listener on the document per root (its own, never removed) — not the component's. */
function tally(spy: { mock: { calls: unknown[][] } }) {
  const counts: Record<string, number> = {};
  for (const [type] of spy.mock.calls) {
    if (type === 'selectionchange') continue;
    counts[String(type)] = (counts[String(type)] ?? 0) + 1;
  }
  return counts;
}

describe('FinalScreen — leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('leaves no timer and no unbalanced listener after unmount (StrictMode, tie)', () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <StrictMode>
        <LangProvider lang="fr">
          <FinalScreen game={game} onRematch={() => {}} onNewGame={() => {}} />
        </LangProvider>
      </StrictMode>,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(tally(winAdd)).toEqual(tally(winRemove));
    expect(tally(docAdd)).toEqual(tally(docRemove));
  });
});
