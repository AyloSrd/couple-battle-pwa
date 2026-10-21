import { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LangProvider } from '@/shared/i18n';
import { probeListeners } from '@/test/listenerProbe';
import { PLAYBACK_CAP_MS, START_TIMEOUT_MS, Splash } from './Splash';
import * as warm from './warmMediaCache';

function mount(onDone: () => void) {
  return render(
    <StrictMode>
      <LangProvider initialLang="en">
        <Splash onDone={onDone} />
      </LangProvider>
    </StrictMode>,
  );
}

describe('Splash leaks (StrictMode)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(warm, 'warmMediaCache').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps exactly one watchdog timer through the double effect, and none after unmount', () => {
    mount(vi.fn()).unmount(); // warm-up: React's own one-time document listeners
    const probe = probeListeners();
    const { container, unmount } = mount(vi.fn());
    expect(vi.getTimerCount()).toBe(1);

    // `playing` swaps the start timeout for the playback cap — still one timer.
    const video = container.querySelector('video');
    if (!video) throw new Error('no video');
    fireEvent(video, new Event('playing'));
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(START_TIMEOUT_MS + 1);
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(probe.unbalanced()).toEqual([]);
    probe.restore();
  });

  it('leaves no timer behind after each finish path', () => {
    for (const finish of [
      (v: HTMLVideoElement) => fireEvent(v, new Event('ended')),
      (v: HTMLVideoElement) => fireEvent.error(v),
      (v: HTMLVideoElement) => fireEvent(v, new Event('stalled')),
      () => vi.advanceTimersByTime(START_TIMEOUT_MS),
      (v: HTMLVideoElement) => {
        fireEvent(v, new Event('playing'));
        vi.advanceTimersByTime(PLAYBACK_CAP_MS);
      },
    ]) {
      const onDone = vi.fn();
      const { container, unmount } = mount(onDone);
      const video = container.querySelector('video');
      if (!video) throw new Error('no video');
      act(() => {
        finish(video);
      });
      expect(onDone).toHaveBeenCalledTimes(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it('adds no window/document/matchMedia listeners at all', () => {
    const mqlAdd = vi.fn();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: mqlAdd,
      addListener: mqlAdd,
    }));
    mount(vi.fn()).unmount(); // warm-up
    const probe = probeListeners();
    mount(vi.fn()).unmount();
    expect(probe.added()).toEqual([]);
    expect(mqlAdd).not.toHaveBeenCalled();
    probe.restore();
    vi.unstubAllGlobals();
  });
});
