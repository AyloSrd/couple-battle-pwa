import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashGate, SPLASH_SEEN_KEY } from './SplashGate';
import * as warm from './warmMediaCache';

describe('SplashGate', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(warm, 'warmMediaCache').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('holds the app behind the splash on a cold start, then mounts it on skip', () => {
    render(
      <SplashGate lang="fr">
        <p>the app</p>
      </SplashGate>,
    );
    expect(screen.queryByText('the app')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: "Passer l'intro" }));
    expect(screen.getByText('the app')).toBeInTheDocument();
    expect(sessionStorage.getItem(SPLASH_SEEN_KEY)).toBe('1');
  });

  it('skips the splash for the rest of the session (reload, update reload)', () => {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    render(
      <SplashGate lang="en">
        <p>the app</p>
      </SplashGate>,
    );
    expect(screen.getByText('the app')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip the intro' })).toBeNull();
  });
});
