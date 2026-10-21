import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaveApiProvider, saveKeys } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { Countdown } from './Countdown';

const STEP_MS = 700;

function mount(ui: ReactElement, lang: 'fr' | 'en' = 'fr', vibration = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const settings = { lang, sound: true, vibration };
  const save = createSaveMemoryApi({ settings });
  // The app gate has read the settings before any game screen mounts: start with a warm cache.
  qc.setQueryData(saveKeys.byKey('settings'), settings);
  return render(
    <QueryClientProvider client={qc}>
      <SaveApiProvider api={save}>
        <LangProvider initialLang={lang}>
          <SoundApiProvider api={createSoundNoopApi()}>{ui}</SoundApiProvider>
        </LangProvider>
      </SaveApiProvider>
    </QueryClientProvider>,
  );
}

/** Jump the timed sequence to the GO beat (after `ticks` digit steps). */
function reachGo(ticks: number) {
  act(() => {
    vi.advanceTimersByTime(ticks * STEP_MS);
  });
}

describe('Countdown — GO word per context', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Dilemma (default, 3 ticks) ends on "POINTEZ !"', () => {
    mount(<Countdown onDone={() => {}} />);
    expect(screen.queryByText('POINTEZ !')).toBeNull(); // still on the digits
    reachGo(3);
    expect(screen.getByText('POINTEZ !')).toBeInTheDocument();
    expect(screen.queryByText('RÉPONDEZ !')).toBeNull();
  });

  it('rapid-fire (2 ticks, go="answer") ends on "RÉPONDEZ !" — nobody points', () => {
    mount(<Countdown ticks={2} go="answer" onDone={() => {}} />);
    reachGo(2);
    expect(screen.getByText('RÉPONDEZ !')).toBeInTheDocument();
    expect(screen.queryByText('POINTEZ !')).toBeNull();
  });

  it('the GO variant is localized like every other string', () => {
    mount(<Countdown ticks={2} go="answer" onDone={() => {}} />, 'en');
    reachGo(2);
    expect(screen.getByText('ANSWER!')).toBeInTheDocument();
  });

  it('only the word changes: GO instant and auto-advance are identical for both variants', () => {
    const GO_MS = 1500;
    for (const go of ['point', 'answer'] as const) {
      const onDone = vi.fn();
      const view = mount(<Countdown ticks={2} go={go} onDone={onDone} />);
      reachGo(2); // GO beat shown, not done yet
      expect(onDone).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(GO_MS - 1);
      });
      expect(onDone).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onDone).toHaveBeenCalledTimes(1);
      view.unmount();
    }
  });
});

describe('Countdown — vibration setting', () => {
  let vibrate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('buzzes on the first tick and on GO when vibration is on', () => {
    mount(<Countdown ticks={2} go="answer" onDone={() => {}} />, 'fr', true);
    expect(vibrate).toHaveBeenCalledWith(50); // first tick, at mount
    act(() => {
      vi.advanceTimersByTime(2 * STEP_MS);
    });
    expect(vibrate).toHaveBeenCalledWith([60, 40, 60]); // GO
  });

  it('stays silent on the haptics when vibration is off', () => {
    mount(<Countdown ticks={2} go="answer" onDone={() => {}} />, 'fr', false);
    act(() => {
      vi.advanceTimersByTime(2 * STEP_MS + 1500);
    });
    expect(vibrate).not.toHaveBeenCalled();
  });
});
