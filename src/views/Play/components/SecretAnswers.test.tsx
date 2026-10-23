import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { playerArtUrl } from '@/shared/Chrome';
import { gameState } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { SecretAnswers } from './SecretAnswers';

function mount(round: number, coupleIdx: number) {
  return renderScreen(<SecretAnswers state={gameState('secretInput', { round, coupleIdx })} onLock={() => {}} />);
}
const badge = (c: HTMLElement) => c.querySelector('.cb-flash-card .cb-actor');

describe('SecretAnswers — who acts: the round’s answerer', () => {
  it('round 0: the first player (art p1), bust decorative, name as text, inside the question card', () => {
    const { container } = mount(0, 0);
    const avatar = badge(container)?.querySelector('.cb-player-avatar');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar?.querySelector('img')?.getAttribute('src')).toBe(playerArtUrl('otters', 1));
    expect(badge(container)?.querySelector('.cb-actor-name')?.textContent).toBe('Ana');
  });

  it('round 1: the second player (art p2)', () => {
    const { container } = mount(1, 0);
    expect(badge(container)?.querySelector('img')?.getAttribute('src')).toBe(playerArtUrl('otters', 2));
    expect(badge(container)?.querySelector('.cb-actor-name')?.textContent).toBe('Bo');
  });

  it('a team without art falls back to the answerer’s initial (follows the current couple)', () => {
    const r0 = mount(0, 1);
    expect(badge(r0.container)?.querySelector('img')).toBeNull();
    expect(badge(r0.container)?.querySelector('.cb-player-avatar')?.textContent).toBe('Z');
    expect(badge(r0.container)?.querySelector('.cb-actor-name')?.textContent).toBe('Zed');
    const r1 = mount(1, 1);
    expect(badge(r1.container)?.querySelector('.cb-player-avatar')?.textContent).toBe('Y');
    expect(badge(r1.container)?.querySelector('.cb-actor-name')?.textContent).toBe('Yan');
  });
});

describe('SecretAnswers — the badge changed nothing about answering', () => {
  const typed = (type: 'open' | 'yes_no' | 'who_of_two') => ({
    ...gameState('secretInput'),
    deck: [{ id: 1, theme: 'childhood' as const, difficulty: 'easy' as const, type, you: 'Q?', name: 'Q de {name}?' }],
  });

  it('open: the lock button stays disabled until there is text, then locks the trimmed answer', () => {
    const onLock = vi.fn();
    const { getByRole, getByPlaceholderText } = renderScreen(<SecretAnswers state={typed('open')} onLock={onLock} />);
    const lock = getByRole('button', { name: /lock my answer/i });
    expect(lock).toBeDisabled();
    fireEvent.change(getByPlaceholderText(/your answer/i), { target: { value: '  pasta ' } });
    fireEvent.click(lock);
    expect(onLock).toHaveBeenCalledWith('pasta');
  });

  it('yes/no: the two answer buttons lock their label', () => {
    const onLock = vi.fn();
    const { getByRole } = renderScreen(<SecretAnswers state={typed('yes_no')} onLock={onLock} />);
    fireEvent.click(getByRole('button', { name: /yes/i }));
    expect(onLock).toHaveBeenCalledWith('Yes');
  });

  it('who_of_two: the buttons are the couple’s names and lock the picked one', () => {
    const onLock = vi.fn();
    const { getByRole } = renderScreen(<SecretAnswers state={typed('who_of_two')} onLock={onLock} />);
    fireEvent.click(getByRole('button', { name: /Bo/ }));
    expect(onLock).toHaveBeenCalledWith('Bo');
  });

  it('no way back: the screen offers no back / cancel control', () => {
    const { queryByRole } = renderScreen(<SecretAnswers state={typed('open')} onLock={() => {}} />);
    expect(queryByRole('button', { name: /back|cancel/i })).toBeNull();
  });
});
