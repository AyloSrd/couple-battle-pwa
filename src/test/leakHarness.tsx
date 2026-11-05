import type { ReactElement } from 'react';
import { expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { soundEngine } from '@/shared/sound';
import { renderWithApp } from './renderApp';

/** Leak tests: mount under StrictMode (app providers, French, spied sound), then check nothing
 *  outlives the unmount (timers, window/document listeners). */
export function mountLeakChecked(ui: ReactElement) {
  // Warm-up: react-dom's first render adds permanent document listeners (selectionchange).
  render(<span />).unmount();
  vi.useFakeTimers();
  const play = vi.spyOn(soundEngine, 'play');
  const targets = [window, document];
  const adds = targets.map((t) => vi.spyOn(t, 'addEventListener'));
  const removes = targets.map((t) => vi.spyOn(t, 'removeEventListener'));

  const view = renderWithApp(ui, { lang: 'fr', strict: true });

  const tally = (calls: unknown[][]) => {
    const byType: Record<string, number> = {};
    for (const [type] of calls) byType[String(type)] = (byType[String(type)] ?? 0) + 1;
    return byType;
  };

  function unmountAndAssertClean() {
    vi.advanceTimersByTime(60_000); // let any stray timer fire first
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    for (let i = 0; i < targets.length; i++) {
      // every listener this component added is removed again, per event type
      const added = tally(adds[i]!.mock.calls);
      const removed = tally(removes[i]!.mock.calls);
      for (const [type, n] of Object.entries(added)) {
        expect(removed[type] ?? 0, `${type} listeners removed on target ${i}`).toBeGreaterThanOrEqual(n);
      }
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  }

  return { play, unmountAndAssertClean };
}
