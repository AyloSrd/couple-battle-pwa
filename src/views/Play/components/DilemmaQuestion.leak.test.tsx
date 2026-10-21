import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import type { TSoundApi } from '@/shared/sound';
import { initGame, type TGameState } from '../domain/machine';
import type { TQuestion } from '@/shared/questions/domain/types';
import type { TRoster } from '@/shared/game/domain/types';
import { DilemmaQuestion } from './DilemmaQuestion';

const roster: TRoster = [
  { teamId: 't1', avatarId: 'otters', players: ['A', 'B'] },
  { teamId: 't2', avatarId: 'lions', players: ['C', 'D'] },
];
const deck: TQuestion[] = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1,
  theme: 'childhood',
  difficulty: 'easy',
  type: 'who_of_two',
  you: `q${i + 1}`,
  name: `q${i + 1}`,
}));

function questionState(): Extract<TGameState, { kind: 'question' }> {
  const s = initGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck });
  if (s.kind !== 'question') throw new Error('expected a question state');
  return s;
}

describe('DilemmaQuestion — leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('only a one-shot whoosh: no timers, no window/document listeners left behind', () => {
    const add = [vi.spyOn(window, 'addEventListener'), vi.spyOn(document, 'addEventListener')];
    const remove = [vi.spyOn(window, 'removeEventListener'), vi.spyOn(document, 'removeEventListener')];
    const sound: TSoundApi = { ...createSoundNoopApi(), play: vi.fn() };
    const view = render(
      <StrictMode>
        <LangProvider initialLang="fr">
          <SoundApiProvider api={sound}>
            <DilemmaQuestion state={questionState()} onReady={() => {}} />
          </SoundApiProvider>
        </LangProvider>
      </StrictMode>,
    );
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(sound.play).toHaveBeenCalledWith('sfx.whoosh');
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);

    const count = (spies: ReturnType<typeof vi.spyOn>[]) => {
      const byType: Record<string, number> = {};
      for (const spy of spies) for (const c of spy.mock.calls) byType[String(c[0])] = (byType[String(c[0])] ?? 0) + 1;
      return byType;
    };
    const added = count(add);
    const removed = count(remove);
    // React itself registers `selectionchange` on the document once per root and never removes it.
    delete added.selectionchange;
    delete removed.selectionchange;
    expect(added).toEqual(removed);
  });
});
