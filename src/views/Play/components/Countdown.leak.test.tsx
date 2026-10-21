import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaveApiProvider } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { Countdown } from './Countdown';

const STEP_MS = 700;
const GO_MS = 1500;

/** React installs its own one-shot `selectionchange` listener on the document and never removes it. */
const REACT_OWNED = new Set(['selectionchange']);

function balance(add: { mock: { calls: unknown[][] } }, remove: { mock: { calls: unknown[][] } }) {
  const net = new Map<string, number>();
  for (const [type] of add.mock.calls) net.set(String(type), (net.get(String(type)) ?? 0) + 1);
  for (const [type] of remove.mock.calls) net.set(String(type), (net.get(String(type)) ?? 0) - 1);
  return [...net].filter(([type, n]) => n !== 0 && !REACT_OWNED.has(type));
}

function mount(onDone: () => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <SaveApiProvider api={createSaveMemoryApi()}>
          <LangProvider initialLang="fr">
            <SoundApiProvider api={createSoundNoopApi()}>
              <Countdown onDone={onDone} />
            </SoundApiProvider>
          </LangProvider>
        </SaveApiProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
  return { view, qc };
}

describe('Countdown — leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('unmounting mid-sequence cancels every pending beat (StrictMode double-mount included)', () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');
    const onDone = vi.fn();
    const { view, qc } = mount(onDone);

    act(() => {
      vi.advanceTimersByTime(STEP_MS + 1);
    });
    view.unmount();
    qc.clear();

    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(10 * STEP_MS);
    });
    expect(onDone).not.toHaveBeenCalled();
    expect(balance(winAdd, winRemove)).toEqual([]);
    expect(balance(docAdd, docRemove)).toEqual([]);
  });

  it('a full run fires onDone exactly once (the StrictMode first pass is cancelled) and leaves no timer', () => {
    const onDone = vi.fn();
    const { view, qc } = mount(onDone);
    act(() => {
      vi.advanceTimersByTime(3 * STEP_MS + GO_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    view.unmount();
    qc.clear();
    expect(vi.getTimerCount()).toBe(0);
  });
});
