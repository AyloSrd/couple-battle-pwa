import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { Countdown } from './Countdown';

const STEP_MS = 700;
const GO_MS = 1500;

/** Net add-minus-remove count per event type across window and document. */
function listenerBalance(spies: ReturnType<typeof vi.spyOn>[]) {
  const balance: Record<string, number> = {};
  spies.forEach((spy, i) => {
    const sign = i % 2 === 0 ? 1 : -1; // spies are [add, remove] pairs
    for (const call of spy.mock.calls) {
      const type = String(call[0]);
      balance[type] = (balance[type] ?? 0) + sign;
    }
  });
  return Object.fromEntries(Object.entries(balance).filter(([, n]) => n !== 0));
}

describe('Countdown — leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mountStrict(ticks = 3) {
    const onDone = vi.fn();
    const view = render(
      <StrictMode>
        <LangProvider initialLang="fr">
          <SoundApiProvider api={createSoundNoopApi()}>
            <Countdown onDone={onDone} ticks={ticks} />
          </SoundApiProvider>
        </LangProvider>
      </StrictMode>,
    );
    return { onDone, view };
  }

  it('StrictMode double-mount leaves exactly one live sequence (onDone fires once)', () => {
    const { onDone, view } = mountStrict();
    act(() => {
      vi.advanceTimersByTime(3 * STEP_MS + GO_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('unmounting mid-sequence clears every pending timer and never calls onDone', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const { onDone, view } = mountStrict();
    act(() => {
      vi.advanceTimersByTime(STEP_MS + 10); // on the second digit, GO + done still pending
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    const buzzes = vibrate.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(10 * STEP_MS);
    });
    expect(onDone).not.toHaveBeenCalled();
    expect(vibrate.mock.calls.length).toBe(buzzes); // no haptics after unmount
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('registers no window/document listeners (add/remove balanced per type)', () => {
    const spies = [
      vi.spyOn(window, 'addEventListener'),
      vi.spyOn(window, 'removeEventListener'),
      vi.spyOn(document, 'addEventListener'),
      vi.spyOn(document, 'removeEventListener'),
    ];
    const { view } = mountStrict(2);
    act(() => {
      vi.advanceTimersByTime(2 * STEP_MS + GO_MS);
    });
    view.unmount();
    // React itself registers `selectionchange` on the document once per root and never removes it.
    const { selectionchange: _reactOwned, ...rest } = listenerBalance(spies);
    expect(rest).toEqual({});
    expect(vi.getTimerCount()).toBe(0);
  });
});
