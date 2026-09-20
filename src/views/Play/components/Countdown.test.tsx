import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { Countdown } from './Countdown';

const STEP_MS = 700;

function mount(ui: ReactElement, lang: 'fr' | 'en' = 'fr') {
  return render(
    <LangProvider initialLang={lang}>
      <SoundApiProvider api={createSoundNoopApi()}>{ui}</SoundApiProvider>
    </LangProvider>,
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
