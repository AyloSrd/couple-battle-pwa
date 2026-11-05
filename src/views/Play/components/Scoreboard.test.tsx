import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { THistoryEntry } from '@/shared/game';
import { soundEngine } from '@/shared/sound';
import { gameAt } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { Scoreboard } from './Scoreboard';

const e = (teamId: string, round: number, points: number): THistoryEntry => ({ teamId, stage: 'flash', round, points, max: 2 });

/** The board after Flash round 2: Zed & Yan led 4–2 at the previous board, Ana & Bo now lead 6–4. */
function secondBoard() {
  const base = gameAt('scoreboard', { round: 1 });
  const history = [e('t1', 0, 2), e('t2', 0, 2), e('t1', 0, 0), e('t2', 0, 2), e('t1', 1, 2), e('t2', 1, 0), e('t1', 1, 2), e('t2', 1, 0)];
  return { ...base, ctx: { ...base.ctx, scores: { t1: 6, t2: 4 }, history } };
}

const rows = (c: HTMLElement) =>
  [...c.querySelectorAll('.cb-row')].map((row) => ({
    names: row.querySelector(':scope > span:not(.cb-avatar):not(.cb-score)')?.textContent,
    score: row.querySelector('.cb-score')?.textContent,
    lead: row.classList.contains('cb-row--lead'),
  }));

describe('Scoreboard — GF3 tally', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('counts up from the previous board in its order, then the new leader settles at #1 with the lead-change sound', () => {
    const play = vi.spyOn(soundEngine, 'play');
    const { container } = renderScreen(<Scoreboard game={secondBoard()} dispatch={() => {}} />);
    expect(play).toHaveBeenCalledWith('mus.round'); // the stinger on entry
    expect(rows(container)).toEqual([
      { names: 'Zed & Yan', score: '4', lead: false },
      { names: 'Ana & Bo', score: '2', lead: false },
    ]);
    expect(container.querySelector('.cb-score-note')).toHaveClass('cb-score-note--pending');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(rows(container)).toEqual([
      { names: 'Ana & Bo', score: '6', lead: true },
      { names: 'Zed & Yan', score: '4', lead: false },
    ]);
    const ids = play.mock.calls.map(([id]) => id);
    expect(ids.filter((id) => id === 'sfx.score.tally')).toHaveLength(3); // 4 steps: 3 ticks, then the landing
    expect(ids.at(-1)).toBe('sfx.synchro');
    expect(container.querySelector('.cb-score-note')).not.toHaveClass('cb-score-note--pending');
  });

  it('a held lead lands on the usual point sound; a tie on its own', () => {
    const held = secondBoard();
    const play = vi.spyOn(soundEngine, 'play');
    renderScreen(<Scoreboard game={{ ...held, ctx: { ...held.ctx, scores: { t1: 2, t2: 4 }, history: held.ctx.history.slice(0, 4).concat([e('t1', 1, 0), e('t2', 1, 0), e('t1', 1, 0), e('t2', 1, 0)]) } }} dispatch={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(play).toHaveBeenLastCalledWith('sfx.point.exact');

    play.mockClear();
    const tied = { ...held, ctx: { ...held.ctx, scores: { t1: 4, t2: 4 }, history: held.ctx.history.slice(0, 4).concat([e('t1', 1, 2), e('t2', 1, 0), e('t1', 1, 0), e('t2', 1, 0)]) } };
    renderScreen(<Scoreboard game={tied} dispatch={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(play).toHaveBeenLastCalledWith('sfx.point.close');
  });

  it('reduced motion: the final standings at once, no tally ticks', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }));
    const play = vi.spyOn(soundEngine, 'play');
    const { container } = renderScreen(<Scoreboard game={secondBoard()} dispatch={() => {}} />);
    expect(rows(container)[0]).toEqual({ names: 'Ana & Bo', score: '6', lead: true });
    expect(play.mock.calls.map(([id]) => id)).not.toContain('sfx.score.tally');
  });
});
