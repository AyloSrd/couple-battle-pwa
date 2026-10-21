import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import type { TGameState } from '../domain/machine';
import { Scoreboard } from './Scoreboard';

const state = {
  kind: 'scoreboard',
  round: 0,
  questionIdx: 0,
  roster: [
    { teamId: 't1', avatarId: 'lions', players: ['Ana', 'Bob'] },
    { teamId: 't2', avatarId: 'bears', players: ['Cleo', 'Dan'] },
  ],
  mode: 'dilemma',
  difficulty: 'easy',
  themes: [],
  deck: [],
  scores: { t1: 2, t2: 1 },
} as unknown as Extract<TGameState, { kind: 'scoreboard' }>;

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

describe('Scoreboard — leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('leaves no timer and no unbalanced listener after unmount (StrictMode)', () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <StrictMode>
        <LangProvider initialLang="fr">
          <SoundApiProvider api={createSoundNoopApi()}>
            <Scoreboard state={state} onNext={() => {}} />
          </SoundApiProvider>
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
