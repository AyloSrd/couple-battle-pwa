import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LangProvider } from '@/shared/i18n';
import { PLAYBACK_CAP_MS, POSTER_HOLD_MS, START_TIMEOUT_MS, Splash } from './Splash';
import * as warm from './warmMediaCache';

let warmSpy: ReturnType<typeof vi.spyOn>;

function mountSplash(onDone: () => void) {
  return render(
    <LangProvider initialLang="en">
      <Splash onDone={onDone} />
    </LangProvider>,
  );
}

function getVideo(container: HTMLElement): HTMLVideoElement {
  const video = container.querySelector('video');
  if (!video) throw new Error('no video rendered');
  return video;
}

describe('Splash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    warmSpy = vi.spyOn(warm, 'warmMediaCache').mockResolvedValue(undefined);
    // jsdom does not implement media playback.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a muted inline video with a poster and an accessible skip button', () => {
    const { container } = mountSplash(vi.fn());
    const video = getVideo(container);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video.getAttribute('src')).toMatch(/splash\/ninou\.mp4$/);
    expect(video.getAttribute('poster')).toMatch(/splash\/ninou-poster\.webp$/);
    expect(screen.getByRole('button', { name: 'Skip the intro' })).toBeInTheDocument();
  });

  it('a tap skips once, releases the video and warms the cache', () => {
    const onDone = vi.fn();
    const { container } = mountSplash(onDone);
    const video = getVideo(container);
    fireEvent.click(screen.getByRole('button', { name: 'Skip the intro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip the intro' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(warmSpy).toHaveBeenCalledTimes(1);
    expect(video.hasAttribute('src')).toBe(false);
  });

  it('goes straight on when the video errors', () => {
    const onDone = vi.fn();
    const { container } = mountSplash(onDone);
    fireEvent.error(getVideo(container));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('goes straight on when the video stalls', () => {
    const onDone = vi.fn();
    const { container } = mountSplash(onDone);
    fireEvent(getVideo(container), new Event('stalled'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('goes straight on when autoplay is refused', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    const onDone = vi.fn();
    mountSplash(onDone);
    await act(async () => {
      await Promise.resolve();
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('goes on when nothing is playing within the start timeout', () => {
    const onDone = vi.fn();
    mountSplash(onDone);
    act(() => {
      vi.advanceTimersByTime(START_TIMEOUT_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('once playing it waits for the end of the clip, then hands off', () => {
    const onDone = vi.fn();
    const { container } = mountSplash(onDone);
    const video = getVideo(container);
    fireEvent(video, new Event('playing'));
    act(() => {
      vi.advanceTimersByTime(START_TIMEOUT_MS + 500);
    });
    expect(onDone).not.toHaveBeenCalled();
    fireEvent(video, new Event('ended'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(warmSpy).toHaveBeenCalledTimes(1);
  });

  it('caps playback so a hung video can never hold the app', () => {
    const onDone = vi.fn();
    const { container } = mountSplash(onDone);
    fireEvent(getVideo(container), new Event('playing'));
    act(() => {
      vi.advanceTimersByTime(PLAYBACK_CAP_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('clears its timer on unmount (no hand-off afterwards)', () => {
    const onDone = vi.fn();
    const { unmount } = mountSplash(onDone);
    unmount();
    act(() => {
      vi.advanceTimersByTime(PLAYBACK_CAP_MS * 2);
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reduced motion: shows the poster only, briefly, and does not warm the video cache', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }));
    const onDone = vi.fn();
    const { container } = mountSplash(onDone);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/ninou-poster\.webp$/);
    act(() => {
      vi.advanceTimersByTime(POSTER_HOLD_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(warmSpy).not.toHaveBeenCalled();
  });
});
