import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { playerArtUrl } from '@/shared/Chrome';
import { gameAt, questionFor } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { answerKey } from '@/shared/game';
import type { TDispatch } from '../application/game';
import { GuessReveal } from './GuessReveal';

function mount(round: number, coupleIdx: number) {
  const game = gameAt('guess', { round: round as 0 | 1, couple: coupleIdx });
  return renderScreen(<GuessReveal game={game} question={questionFor(game)} dispatch={() => {}} />);
}

const badge = (c: HTMLElement) => c.querySelector('.cb-flash-card .cb-actor');

describe('GuessReveal — who acts: the GUESSER (the answerer’s partner)', () => {
  it('round 0: the answerer is player 1, so the guesser shown is player 2 (art p2)', () => {
    const { container } = mount(0, 0);
    const avatar = badge(container)?.querySelector('.cb-player-avatar');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar?.querySelector('img')?.getAttribute('src')).toBe(playerArtUrl('otters', 2));
    expect(badge(container)?.querySelector('.cb-actor-name')?.textContent).toBe('Bo');
  });

  it('round 1: roles swap — the guesser is player 1 (art p1)', () => {
    const { container } = mount(1, 0);
    expect(badge(container)?.querySelector('img')?.getAttribute('src')).toBe(playerArtUrl('otters', 1));
    expect(badge(container)?.querySelector('.cb-actor-name')?.textContent).toBe('Ana');
  });

  it('the name on the badge is the one the lead line addresses', () => {
    const { container } = mount(0, 0);
    expect(container.querySelector('.cb-flash-lead')?.textContent).toContain('Bo');
  });

  it('a team without art falls back to the guesser’s initial', () => {
    const r0 = mount(0, 1);
    expect(badge(r0.container)?.querySelector('img')).toBeNull();
    expect(badge(r0.container)?.querySelector('.cb-player-avatar')?.textContent).toBe('Y');
    const r1 = mount(1, 1);
    expect(badge(r1.container)?.querySelector('.cb-player-avatar')?.textContent).toBe('Z');
  });
});

type TQType = 'open' | 'yes_no' | 'who_of_two';
const typed = (type: TQType, truth?: string) => {
  const base = gameAt('guess');
  return {
    ...base,
    ctx: { ...base.ctx, deck: [{ id: 1, type }] },
    step: { ...base.step, secrets: truth === undefined ? {} : { [answerKey('t1', 1)]: truth } },
  };
};
const typedQuestion = (type: TQType) => ({ id: 1, theme: 'childhood' as const, difficulty: 'easy' as const, type, you: 'Q?', name: 'Q de {name}?' });
// gameAt('guess'): round 0, couple 0 → Ana answered, Bo guesses.
const mountTyped = (type: TQType, h: { dispatch?: TDispatch; truth?: string } = {}, lang: 'en' | 'fr' = 'en') =>
  renderScreen(
    <GuessReveal game={typed(type, h.truth)} question={typedQuestion(type)} dispatch={h.dispatch ?? (() => {})} />,
    lang,
  );

describe('GuessReveal — the badge changed nothing about guessing', () => {
  it('open: REVEAL stays and advances to the judge', () => {
    const dispatch = vi.fn();
    const { getByRole } = mountTyped('open', { dispatch });
    fireEvent.click(getByRole('button', { name: /reveal/i }));
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith({ type: 'next' });
  });

  it('yes/no: the pick auto-guesses its token, on NEXT', () => {
    const dispatch = vi.fn();
    const { getByRole } = mountTyped('yes_no', { dispatch, truth: 'yes' });
    fireEvent.click(getByRole('button', { name: /no/i }));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(getByRole('button', { name: /next/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'guess', value: 'no' });
  });

  it('who_of_two: the pick auto-guesses the picked player’s index, on NEXT', () => {
    const dispatch = vi.fn();
    const { getByRole } = mountTyped('who_of_two', { dispatch, truth: 'p0' });
    fireEvent.click(getByRole('button', { name: /Ana/ }));
    fireEvent.click(getByRole('button', { name: /next/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'guess', value: 'p0' });
  });
});

describe('GuessReveal — an auto-judged pick reveals the partner’s real answer', () => {
  const reveal = (c: HTMLElement) => c.querySelector('.cb-flash-card--reveal');

  it('nothing is revealed before the pick', () => {
    const { container } = mountTyped('yes_no', { truth: 'yes' });
    expect(reveal(container)).toBeNull();
  });

  it('a wrong pick shows the real answer and the miss verdict', () => {
    const { container, getByRole, getByText } = mountTyped('yes_no', { truth: 'yes' });
    fireEvent.click(getByRole('button', { name: /no/i }));
    expect(reveal(container)?.textContent).toBe('Yes');
    expect(reveal(container)).toHaveClass('is-miss');
    expect(getByText('Ana answered:')).toBeInTheDocument();
    expect(getByText(/Missed!/)).toBeInTheDocument();
    expect(container.querySelector('.cb-answers')).toBeNull();
  });

  it('a right pick shows the real answer and the match verdict', () => {
    const { container, getByRole, getByText } = mountTyped('who_of_two', { truth: 'p1' });
    fireEvent.click(getByRole('button', { name: /Bo/ }));
    expect(reveal(container)?.textContent).toBe('Bo');
    expect(reveal(container)).toHaveClass('is-match');
    expect(getByText(/MATCH! \+2/)).toBeInTheDocument();
  });

  it('the stored token is language-free: a French table reads and matches it in French', () => {
    const { container, getByRole } = mountTyped('yes_no', { truth: 'yes' }, 'fr');
    fireEvent.click(getByRole('button', { name: /oui/i }));
    expect(reveal(container)?.textContent).toBe('Oui');
    expect(reveal(container)).toHaveClass('is-match');
  });
});
