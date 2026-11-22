import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { soundEngine } from '@/shared/sound';
import { choiceQuestion, classicQuestion, gameWithCard } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { SecretAnswers } from './SecretAnswers';

/**
 * The answer screen of a choice card (component on its own; whole games are in `Play.choice.test.tsx`). The question card holds the
 * question (`.cb-flash-card--choice` marks it, so the stylesheet can size it 17 / 23 px), and under it `ChoiceList mode="pick"`:
 * a tap on a card IS the lock (`answer` with the token, `sfx.lock`), there is no field and no Lock button. The other types keep their
 * screens (green on purpose).
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const q = choiceQuestion(1);
const cardNames = [0, 1, 2].map((n) => `${'ABC'[n]}. ${q.options[n]}`);
const mount = (dispatch = vi.fn(), lang: 'en' | 'fr' = 'en') => ({
  dispatch,
  ...renderScreen(<SecretAnswers game={gameWithCard('secret', 'choice')} question={q} dispatch={dispatch} />, lang),
});

describe('SecretAnswers, a choice question', () => {
  it('shows the question on the card, the three answers as buttons under it, and no field, no Lock button', () => {
    const { container, getAllByRole, queryByRole, queryByPlaceholderText } = mount();
    const cardEl = container.querySelector('.cb-flash-card')!;
    expect(cardEl).toHaveClass('cb-flash-card--choice');
    expect(cardEl.querySelector('.cb-question')?.textContent).toBe(q.question);
    expect(getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(cardNames);
    const list = container.querySelector('.cb-choice-list')!;
    expect(list).toBeTruthy();
    expect(cardEl.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('input, textarea')).toBeNull();
    expect(queryByRole('button', { name: /lock my answer/i })).toBeNull();
    expect(queryByPlaceholderText(/your answer/i)).toBeNull();
    expect(container.querySelector('.cb-answers')).toBeNull();
    expect(queryByRole('button', { name: /back|cancel/i })).toBeNull(); // no way back
  });

  it('still names the answerer on the card (the actor badge) and shows the answerers\' chip', () => {
    const { container } = mount();
    expect(container.querySelector('.cb-flash-card .cb-actor .cb-actor-name')?.textContent).toBe('Ana');
    expect(container.querySelector('.cb-chip')?.textContent).toMatch(/answerers/i);
  });

  it.each([0, 1, 2])('a tap on card %i locks it at once: one `answer` with its token, the lock cue, nothing else', (n) => {
    const play = vi.spyOn(soundEngine, 'play');
    const { dispatch, getByRole } = mount();
    play.mockClear();
    fireEvent.click(getByRole('button', { name: cardNames[n]! }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'answer', value: `c${n}` }]]);
    expect(play.mock.calls.map(([id]) => id)).toEqual(['sfx.lock']);
  });

  it('never sends the option text, in any language: only c0, c1, c2', () => {
    const { dispatch, getByRole } = mount(vi.fn(), 'fr');
    for (const name of cardNames) fireEvent.click(getByRole('button', { name }));
    expect(dispatch.mock.calls.map(([event]) => event.value)).toEqual(['c0', 'c1', 'c2']);
  });

  it('tells the answerer nothing but the question and the answers: no ring, no tag, no name tag', () => {
    const { container } = mount();
    expect(container.querySelectorAll('.is-truth, .is-pick, .is-match, .is-miss, .cb-choice__tag')).toHaveLength(0);
  });
});

describe('green on purpose: the other types keep their answer screens', () => {
  const mountType = (type: 'open' | 'this_or_that' | 'yes_no' | 'who_of_two') =>
    renderScreen(<SecretAnswers game={gameWithCard('secret', type)} question={classicQuestion(type)} dispatch={() => {}} />);

  it.each(['open', 'this_or_that'] as const)('%s: the field and Lock, no ChoiceList, no choice card class', (type) => {
    const { container, getByRole, getByPlaceholderText } = mountType(type);
    expect(getByPlaceholderText(/your answer/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /lock my answer/i })).toBeInTheDocument();
    expect(container.querySelector('.cb-choice-list')).toBeNull();
    expect(container.querySelector('.cb-flash-card--choice')).toBeNull();
  });

  it.each(['yes_no', 'who_of_two'] as const)('%s: two answer buttons in `.cb-answers`, no ChoiceList', (type) => {
    const { container, getAllByRole } = mountType(type);
    expect(getAllByRole('button')).toHaveLength(2);
    expect(container.querySelector('.cb-answers')).not.toBeNull();
    expect(container.querySelector('.cb-choice-list')).toBeNull();
    expect(container.querySelector('.cb-flash-card--choice')).toBeNull();
  });
});
