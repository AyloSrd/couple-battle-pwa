import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import type { TGameState } from '../domain/machine';
import { FinalScreen } from './FinalScreen';

const state = {
  kind: 'final',
  roster: [
    { teamId: 't1', avatarId: 'lions', players: ['Ana', 'Bob'] },
    { teamId: 't2', avatarId: 'bears', players: ['Cleo', 'Dan'] },
  ],
  mode: 'dilemma',
  difficulty: 'easy',
  themes: [],
  deck: [],
  scores: { t1: 3, t2: 3 },
} as unknown as Extract<TGameState, { kind: 'final' }>;

type TCounts = Record<string, number>;
// React DOM installs one permanent document-level `selectionchange` listener per document
// (framework-owned, not ours) — ignore it so only our own subscriptions are compared.
const FRAMEWORK_EVENTS = new Set(['selectionchange']);
function tally(spy: { mock: { calls: unknown[][] } }): TCounts {
  const out: TCounts = {};
  for (const [type] of spy.mock.calls) {
    const key = String(type);
    if (!FRAMEWORK_EVENTS.has(key)) out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

describe('FinalScreen — leaks', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('leaves no timer and no unbalanced listener after unmount (StrictMode)', () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');

    const view = render(
      <StrictMode>
        <LangProvider initialLang="en">
          <SoundApiProvider api={createSoundNoopApi()}>
            <FinalScreen state={state} onRematch={() => {}} onNewGame={() => {}} />
          </SoundApiProvider>
        </LangProvider>
      </StrictMode>,
    );
    vi.advanceTimersByTime(10_000);
    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(tally(winRemove)).toEqual(tally(winAdd));
    expect(tally(docRemove)).toEqual(tally(docAdd));
  });
});
