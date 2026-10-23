import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { DraftGameProvider } from '@/shared/session';
import { fr } from '@/data/strings.fr';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

import { SetupView } from './index';

/** Like the real router, a navigation unmounts the view (otherwise the done effect would loop on a never-unmounting view). */
function Host() {
  const [gone, setGone] = useState(false);
  navigate.mockImplementation(() => setGone(true));
  return gone ? null : <SetupView />;
}

/** add/remove counts per event type. `selectionchange` is React DOM's own once-per-document listener (never removed by design). */
/** jsdom fires a 0ms timer for `selectionchange` when an input is focused (autofocus on the names step); flush it, app timers are all > 0ms. */
const flushJsdomZeroTimers = () => act(() => vi.advanceTimersByTime(0));

function tally(spy: { mock: { calls: unknown[][] } }): Map<string, number> {
  const m = new Map<string, number>();
  for (const [type] of spy.mock.calls) {
    if (type === 'selectionchange') continue;
    m.set(String(type), (m.get(String(type)) ?? 0) + 1);
  }
  return m;
}

describe('SetupView — leaks (StrictMode, fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigate.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('drives the whole wizard (2 couples, taken tile, back) and unmounts clean', () => {
    const addW = vi.spyOn(window, 'addEventListener');
    const remW = vi.spyOn(window, 'removeEventListener');
    const addD = vi.spyOn(document, 'addEventListener');
    const remD = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <StrictMode>
        <LangProvider initialLang="fr">
          <SoundApiProvider api={createSoundNoopApi()}>
            <DraftGameProvider>
              <Host />
            </DraftGameProvider>
          </SoundApiProvider>
        </LangProvider>
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: 'lions' }));
    fireEvent.click(screen.getByRole('button', { name: fr['common.next'] }));
    fireEvent.change(screen.getByPlaceholderText(fr['setup.names.p1']), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByPlaceholderText(fr['setup.names.p2']), { target: { value: 'Bo' } });
    fireEvent.click(screen.getByRole('button', { name: fr['common.next'] }));
    // pass interstitial → team pick for couple 2, lions now taken
    fireEvent.click(screen.getByRole('button', { name: fr['setup.pass.confirm'] }));
    const taken = screen.getByRole('button', { name: 'lions' });
    expect(taken).toBeDisabled();
    fireEvent.click(taken);
    flushJsdomZeroTimers();
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(tally(addW)).toEqual(tally(remW));
    expect(tally(addD)).toEqual(tally(remD));
  });

  it('finishing the last couple seeds the roster once and navigates to /mode', () => {
    const { unmount } = render(
      <StrictMode>
        <LangProvider initialLang="fr">
          <SoundApiProvider api={createSoundNoopApi()}>
            <DraftGameProvider>
              <Host />
            </DraftGameProvider>
          </SoundApiProvider>
        </LangProvider>
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: 'otters' }));
    fireEvent.click(screen.getByRole('button', { name: fr['common.next'] }));
    fireEvent.change(screen.getByPlaceholderText(fr['setup.names.p1']), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByPlaceholderText(fr['setup.names.p2']), { target: { value: 'Bo' } });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: fr['setup.ready'] }));
    });
    expect(navigate).toHaveBeenCalledWith({ to: '/mode' });
    expect(navigate).toHaveBeenCalledTimes(1);
    flushJsdomZeroTimers();
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
