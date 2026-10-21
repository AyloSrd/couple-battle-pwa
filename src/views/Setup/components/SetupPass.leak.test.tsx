import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { SetupPass } from './SetupPass';

/** add/remove counts per event type. `selectionchange` is React DOM's own once-per-document listener (never removed by design). */
function tally(spy: { mock: { calls: unknown[][] } }): Map<string, number> {
  const m = new Map<string, number>();
  for (const [type] of spy.mock.calls) {
    if (type === 'selectionchange') continue;
    m.set(String(type), (m.get(String(type)) ?? 0) + 1);
  }
  return m;
}

describe('SetupPass — leaks (StrictMode, fake timers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('only fires the pass cue; leaves no timers or listeners behind', () => {
    const addW = vi.spyOn(window, 'addEventListener');
    const remW = vi.spyOn(window, 'removeEventListener');
    const addD = vi.spyOn(document, 'addEventListener');
    const remD = vi.spyOn(document, 'removeEventListener');
    const api = createSoundNoopApi();
    const play = vi.spyOn(api, 'play');

    const { unmount } = render(
      <StrictMode>
        <LangProvider initialLang="fr">
          <SoundApiProvider api={api}>
            <SetupPass nextCoupleNumber={2} onConfirm={vi.fn()} />
          </SoundApiProvider>
        </LangProvider>
      </StrictMode>,
    );
    expect(play).toHaveBeenCalledWith('sfx.pass');
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(tally(addW)).toEqual(tally(remW));
    expect(tally(addD)).toEqual(tally(remD));
  });
});
