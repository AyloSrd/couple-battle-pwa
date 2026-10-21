import { StrictMode, type ReactElement } from 'react';
import { expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';

/**
 * Shared harness for the `*.leak.test.tsx` files: mounts a component under
 * StrictMode with the real language provider and a spied no-op sound port,
 * then checks nothing outlives the unmount (timers, window/document listeners).
 */
export function mountLeakChecked(ui: ReactElement) {
  // react-dom registers a few permanent document listeners (e.g. selectionchange)
  // on its first render in a document. Warm that up so the spies below only see
  // what the component under test adds.
  render(<span />).unmount();
  vi.useFakeTimers();
  const sound = createSoundNoopApi();
  const play = vi.spyOn(sound, 'play');
  const targets = [window, document];
  const adds = targets.map((t) => vi.spyOn(t, 'addEventListener'));
  const removes = targets.map((t) => vi.spyOn(t, 'removeEventListener'));

  const view = render(
    <StrictMode>
      <LangProvider initialLang="fr">
        <SoundApiProvider api={sound}>{ui}</SoundApiProvider>
      </LangProvider>
    </StrictMode>,
  );

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
