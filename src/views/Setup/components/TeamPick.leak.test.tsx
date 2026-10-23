import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { fr } from '@/data/strings.fr';
import { initSetup, reduceSetup, type TSetupState } from '../domain/machine';
import { TeamPick } from './TeamPick';

/** Couple 1 has locked lions, so couple 2's grid shows a taken tile (its tap raises the toast). */
function secondCoupleState(): TSetupState {
  let s = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
  s = reduceSetup(s, { type: 'selectAvatar', avatarId: 'lions' });
  s = reduceSetup(s, { type: 'confirmTeam' });
  s = reduceSetup(s, { type: 'setName', which: 1, value: 'Ana' });
  s = reduceSetup(s, { type: 'setName', which: 2, value: 'Bo' });
  s = reduceSetup(s, { type: 'confirmNames' });
  return reduceSetup(s, { type: 'confirmPass' });
}

/** add/remove counts per event type. `selectionchange` is React DOM's own once-per-document listener (never removed by design). */
function tally(spy: { mock: { calls: unknown[][] } }): Map<string, number> {
  const m = new Map<string, number>();
  for (const [type] of spy.mock.calls) {
    if (type === 'selectionchange') continue;
    m.set(String(type), (m.get(String(type)) ?? 0) + 1);
  }
  return m;
}

describe('TeamPick — leaks (StrictMode, fake timers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('no timers or listeners remain after taps and unmount', () => {
    const addW = vi.spyOn(window, 'addEventListener');
    const remW = vi.spyOn(window, 'removeEventListener');
    const addD = vi.spyOn(document, 'addEventListener');
    const remD = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <StrictMode>
        <LangProvider initialLang="fr">
          <SoundApiProvider api={createSoundNoopApi()}>
            <TeamPick state={secondCoupleState()} onSelect={vi.fn()} onNext={vi.fn()} />
          </SoundApiProvider>
        </LangProvider>
      </StrictMode>,
    );

    // A taken tile is disabled, so tapping it can never raise the toast (and so never arms its timer).
    const taken = screen.getByRole('button', { name: 'lions' });
    expect(taken).toBeDisabled();
    fireEvent.click(taken);
    expect(screen.queryByText(fr['setup.team.taken'])).toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    // a free tile selects through the parent callback only: no timers either
    fireEvent.click(screen.getByRole('button', { name: 'otters' }));
    act(() => vi.advanceTimersByTime(5000));
    expect(vi.getTimerCount()).toBe(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);

    expect(tally(addW)).toEqual(tally(remW));
    expect(tally(addD)).toEqual(tally(remD));
  });
});
