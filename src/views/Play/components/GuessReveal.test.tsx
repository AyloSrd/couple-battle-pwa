import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { playerArtUrl } from '@/shared/Chrome';
import { gameState, testRoster } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { answerKey, answererIndex } from '../domain/machine';
import { GuessReveal } from './GuessReveal';

function mount(round: number, coupleIdx: number) {
  const [a, b] = testRoster[coupleIdx]!.players;
  const [answerer, guesser] = answererIndex(round) === 0 ? [a, b] : [b, a];
  return renderScreen(
    <GuessReveal
      state={gameState('guess', { round, coupleIdx })}
      guesserName={guesser}
      partnerName={answerer}
      onReveal={() => {}}
      onAutoGuess={() => {}}
    />,
  );
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
const typed = (type: TQType, truth?: string) => ({
  ...gameState('guess'),
  deck: [{ id: 1, theme: 'childhood' as const, difficulty: 'easy' as const, type, you: 'Q?', name: 'Q de {name}?' }],
  secretAnswers: truth === undefined ? {} : { [answerKey('t1', 1)]: truth },
});
const mountTyped = (type: TQType, h: { onReveal?: () => void; onAutoGuess?: (g: string) => void; truth?: string } = {}) =>
  renderScreen(
    <GuessReveal
      state={typed(type, h.truth)}
      guesserName="Bo"
      partnerName="Ana"
      onReveal={h.onReveal ?? (() => {})}
      onAutoGuess={h.onAutoGuess ?? (() => {})}
    />,
  );

describe('GuessReveal — the badge changed nothing about guessing', () => {
  it('open: REVEAL stays and fires onReveal', () => {
    const onReveal = vi.fn();
    const { getByRole } = mountTyped('open', { onReveal });
    fireEvent.click(getByRole('button', { name: /reveal/i }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('yes/no: the pick auto-guesses its label, on NEXT', () => {
    const onAutoGuess = vi.fn();
    const { getByRole } = mountTyped('yes_no', { onAutoGuess, truth: 'Yes' });
    fireEvent.click(getByRole('button', { name: /no/i }));
    expect(onAutoGuess).not.toHaveBeenCalled();
    fireEvent.click(getByRole('button', { name: /next/i }));
    expect(onAutoGuess).toHaveBeenCalledWith('No');
  });

  it('who_of_two: the pick auto-guesses its name, on NEXT', () => {
    const onAutoGuess = vi.fn();
    const { getByRole } = mountTyped('who_of_two', { onAutoGuess, truth: 'Ana' });
    fireEvent.click(getByRole('button', { name: /Ana/ }));
    fireEvent.click(getByRole('button', { name: /next/i }));
    expect(onAutoGuess).toHaveBeenCalledWith('Ana');
  });
});

describe('GuessReveal — an auto-judged pick reveals the partner’s real answer', () => {
  const reveal = (c: HTMLElement) => c.querySelector('.cb-flash-card--reveal');

  it('nothing is revealed before the pick', () => {
    const { container } = mountTyped('yes_no', { truth: 'Yes' });
    expect(reveal(container)).toBeNull();
  });

  it('a wrong pick shows the real answer and the miss verdict', () => {
    const { container, getByRole, getByText } = mountTyped('yes_no', { truth: 'Yes' });
    fireEvent.click(getByRole('button', { name: /no/i }));
    expect(reveal(container)?.textContent).toBe('Yes');
    expect(reveal(container)).toHaveClass('is-miss');
    expect(getByText('Ana answered:')).toBeInTheDocument();
    expect(getByText(/Missed!/)).toBeInTheDocument();
    expect(container.querySelector('.cb-answers')).toBeNull();
  });

  it('a right pick shows the real answer and the match verdict', () => {
    const { container, getByRole, getByText } = mountTyped('who_of_two', { truth: 'Bo' });
    fireEvent.click(getByRole('button', { name: /Bo/ }));
    expect(reveal(container)?.textContent).toBe('Bo');
    expect(reveal(container)).toHaveClass('is-match');
    expect(getByText(/MATCH! \+2/)).toBeInTheDocument();
  });
});
