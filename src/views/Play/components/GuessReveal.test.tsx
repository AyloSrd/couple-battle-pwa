import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { playerArtUrl } from '@/shared/Chrome';
import { gameState, testRoster } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { answererIndex } from '../domain/machine';
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

describe('GuessReveal — the badge changed nothing about guessing', () => {
  const typed = (type: 'open' | 'yes_no' | 'who_of_two') => ({
    ...gameState('guess'),
    deck: [{ id: 1, theme: 'childhood' as const, difficulty: 'easy' as const, type, you: 'Q?', name: 'Q de {name}?' }],
  });
  const mountTyped = (type: 'open' | 'yes_no' | 'who_of_two', h: { onReveal?: () => void; onAutoGuess?: (g: string) => void }) =>
    renderScreen(
      <GuessReveal
        state={typed(type)}
        guesserName="Bo"
        partnerName="Ana"
        onReveal={h.onReveal ?? (() => {})}
        onAutoGuess={h.onAutoGuess ?? (() => {})}
      />,
    );

  it('open: REVEAL stays and fires onReveal', () => {
    const onReveal = vi.fn();
    const { getByRole } = mountTyped('open', { onReveal });
    fireEvent.click(getByRole('button', { name: /reveal/i }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('yes/no and who_of_two: the guess buttons stay and auto-guess their label', () => {
    const yn = vi.fn();
    fireEvent.click(mountTyped('yes_no', { onAutoGuess: yn }).getByRole('button', { name: /no/i }));
    expect(yn).toHaveBeenCalledWith('No');
    const two = vi.fn();
    fireEvent.click(mountTyped('who_of_two', { onAutoGuess: two }).getByRole('button', { name: /Ana/ }));
    expect(two).toHaveBeenCalledWith('Ana');
  });
});
