import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { playerArtUrl } from '@/shared/Chrome';
import { gameAt, questionFor } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { SecretAnswers } from './SecretAnswers';

function mount(round: number, coupleIdx: number) {
  const game = gameAt('secret', { round: round as 0 | 1, couple: coupleIdx });
  return renderScreen(<SecretAnswers game={game} question={questionFor(game)} dispatch={() => {}} />);
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
  const typed = (type: 'open' | 'yes_no' | 'who_of_two') => {
    const base = gameAt('secret');
    return {
      game: { ...base, ctx: { ...base.ctx, deck: [{ id: 1, type }] } },
      question: { id: 1, theme: 'childhood' as const, difficulty: 'easy' as const, type, you: 'Q?', name: 'Q de {name}?' },
    };
  };

  it('open: the lock button stays disabled until there is text, then locks the trimmed answer', () => {
    const dispatch = vi.fn();
    const { getByRole, getByPlaceholderText } = renderScreen(<SecretAnswers {...typed('open')} dispatch={dispatch} />);
    const lock = getByRole('button', { name: /lock my answer/i });
    expect(lock).toBeDisabled();
    fireEvent.change(getByPlaceholderText(/your answer/i), { target: { value: '  pasta ' } });
    fireEvent.click(lock);
    expect(dispatch).toHaveBeenCalledWith({ type: 'answer', value: 'pasta' });
  });

  it('open: invisible-only text (zero-width, bidi controls, spaces) cannot lock; the lock sends the normalised text', () => {
    const dispatch = vi.fn();
    const { getByRole, getByPlaceholderText } = renderScreen(<SecretAnswers {...typed('open')} dispatch={dispatch} />);
    const field = getByPlaceholderText(/your answer/i);
    const lock = getByRole('button', { name: /lock my answer/i });
    fireEvent.change(field, { target: { value: ' \u200B\u202E\u2066 ' } });
    expect(lock).toBeDisabled();
    fireEvent.click(lock);
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: ' Ky\u200Boto\u202E ' } });
    expect(lock).toBeEnabled();
    fireEvent.click(lock);
    expect(dispatch).toHaveBeenCalledWith({ type: 'answer', value: 'Kyoto' });
  });

  it('yes/no: the two answer buttons show the localized word and lock the language-free token', () => {
    const dispatch = vi.fn();
    const { getByRole } = renderScreen(<SecretAnswers {...typed('yes_no')} dispatch={dispatch} />);
    fireEvent.click(getByRole('button', { name: /yes/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'answer', value: 'yes' });
    const fr = vi.fn();
    renderScreen(<SecretAnswers {...typed('yes_no')} dispatch={fr} />, 'fr').getByRole('button', { name: /non/i }).click();
    expect(fr).toHaveBeenCalledWith({ type: 'answer', value: 'no' });
  });

  it('who_of_two: the buttons are the couple’s names and lock the picked player’s index', () => {
    const dispatch = vi.fn();
    const { getByRole } = renderScreen(<SecretAnswers {...typed('who_of_two')} dispatch={dispatch} />);
    fireEvent.click(getByRole('button', { name: /Bo/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'answer', value: 'p1' });
    fireEvent.click(getByRole('button', { name: /Ana/ }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'answer', value: 'p0' });
  });

  it('no way back: the screen offers no back / cancel control', () => {
    const { queryByRole } = renderScreen(<SecretAnswers {...typed('open')} dispatch={() => {}} />);
    expect(queryByRole('button', { name: /back|cancel/i })).toBeNull();
  });
});
