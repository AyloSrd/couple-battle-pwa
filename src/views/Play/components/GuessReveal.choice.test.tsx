import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { fr } from '@/data/strings.fr';
import { interpolate } from '@/shared/i18n';
import { soundEngine } from '@/shared/sound';
import { choiceQuestion, classicQuestion, gameWithCard } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import type { TDispatch } from '../application/game';
import { GuessReveal } from './GuessReveal';

/**
 * The guess screen of a choice card (component on its own). Under the existing lead (`guess.turn`), the question card holds the SAME
 * question the answerer read (not rewritten about the partner), then `ChoiceList mode="pick"`. After the pick, the same list in
 * `mode="result"` in place (no reveal card, no flip), the verdict line (`judge.auto.match` / `judge.auto.miss`), then Next
 * (`common.next`), which sends `guess` with the pick. The pick is made once. The web does not announce to screen readers (no live
 * region on the other types either): the result is in the cards' names. gameWithCard('guess'): Ana answered, Bo guesses.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const q = choiceQuestion(1);
const cardName = (n: number) => `${'ABC'[n]}. ${q.options[n]}`;
const lead = interpolate(en['guess.turn'], { name: 'Bo', partner: 'Ana' });
const mount = (truth = 'c1', dispatch: TDispatch = vi.fn(), lang: 'en' | 'fr' = 'en') =>
  renderScreen(<GuessReveal game={gameWithCard('guess', 'choice', truth)} question={q} dispatch={dispatch} />, lang);
const pickCard = (view: ReturnType<typeof mount>, token: string) => fireEvent.click(view.getByRole('button', { name: cardName(Number(token.slice(1))) }));
const after = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('GuessReveal, a choice question: before the pick', () => {
  it('the lead, then the SAME question on the card, then the three answers; no reveal button, no hint, no Next', () => {
    const view = mount();
    const { container, getByText, queryByRole, queryByText } = view;
    expect(getByText(lead)).toBeInTheDocument();
    const cardEl = container.querySelector('.cb-flash-card')!;
    expect(cardEl).toHaveClass('cb-flash-card--choice');
    expect(cardEl.querySelector('.cb-question')?.textContent).toBe(q.question); // the answerer's question, not "about Ana"
    expect(view.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([0, 1, 2].map(cardName));
    expect(queryByRole('button', { name: /reveal/i })).toBeNull();
    expect(queryByText(en['guess.outloud'])).toBeNull();
    expect(container.querySelector('.cb-flash-card--reveal, .cb-flash-card--flip, .cb-answers')).toBeNull();
    expect(queryByRole('button', { name: /next/i })).toBeNull();
  });

  it('is laid out lead, question card, list', () => {
    const { container } = mount();
    const [leadEl, cardEl, list] = ['.cb-flash-lead', '.cb-flash-card', '.cb-choice-list'].map((s) => container.querySelector(s)!);
    expect(leadEl!.textContent).toBe(lead);
    expect(after(leadEl!, cardEl!) && after(cardEl!, list!)).toBe(true);
  });

  it('the guesser\'s badge is on the card (Bo) and nothing of the real answer shows: the screen is the same whatever the answer is', () => {
    const [a, b, c] = ['c0', 'c1', 'c2'].map((truth) => {
      const view = mount(truth);
      const html = view.container.innerHTML;
      view.unmount();
      return html;
    });
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).not.toMatch(/is-truth|cb-choice__tag/);
    const view = mount();
    expect(view.container.querySelector('.cb-flash-card .cb-actor-name')?.textContent).toBe('Bo');
  });

  it('a pick is not a move: nothing is sent to the game before Next', () => {
    const dispatch = vi.fn();
    pickCard(mount('c1', dispatch), 'c1');
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe.each([
  ['a miss', 'c0', 'judge.auto.miss', 'judge.auto.match', 'sfx.point.miss'],
  ['a match', 'c1', 'judge.auto.match', 'judge.auto.miss', 'sfx.point.exact'],
] as const)('GuessReveal, a choice question: after %s (truth c1, guess %s)', (_label, guess, verdict, other, landing) => {
  it('the list stays in place in result mode (no button, no reveal card), with the verdict line then a Next button', () => {
    const view = mount('c1');
    pickCard(view, guess);
    const { container, getByText, queryByText, getByRole, queryAllByRole } = view;
    expect(container.querySelectorAll('.cb-choice-list')).toHaveLength(1);
    expect(container.querySelector('.cb-choice-list')?.getAttribute('role')).toBe('list');
    expect(queryAllByRole('button', { name: /^[ABC]\. / })).toEqual([]);
    expect(container.querySelector('.cb-flash-card--reveal, .cb-flash-card--flip, .cb-answers')).toBeNull();
    const verdictEl = getByText(en[verdict]);
    expect(verdictEl).toHaveClass('cb-flash-verdict');
    expect(queryByText(en[other])).toBeNull();
    const next = getByRole('button', { name: en['common.next'] });
    const cardEl = container.querySelector('.cb-flash-card')!;
    expect(cardEl.querySelector('.cb-question')?.textContent).toBe(q.question); // the question stays
    expect(after(cardEl, container.querySelector('.cb-choice-list')!)).toBe(true);
    expect(after(container.querySelector('.cb-choice-list')!, verdictEl)).toBe(true);
    expect(after(verdictEl, next)).toBe(true);
  });

  it('puts the names on the cards: the answerer (Ana) on the real answer, the guesser (Bo) on the pick (both on one card on a match)', () => {
    const view = mount('c1');
    pickCard(view, guess);
    const card = (token: string) => view.container.querySelector<HTMLElement>(`.cb-choice[data-token="${token}"]`)!;
    const names = (token: string) => [...card(token).querySelectorAll('.cb-choice__tag')].map((n) => n.textContent).sort();
    if (guess === 'c1') expect(names('c1')).toEqual(['Ana', 'Bo']);
    else expect([names('c1'), names(guess)]).toEqual([['Ana'], ['Bo']]);
    expect(card('c1')).toHaveClass('is-truth');
    expect(card('c1').getAttribute('aria-label')).toContain(interpolate((en as Record<string, string>)['choice.answer']!, { name: 'Ana' }));
    expect(card(guess).getAttribute('aria-label')).toContain(interpolate((en as Record<string, string>)['choice.guess']!, { name: 'Bo' }));
    expect(card(guess)).toHaveClass(guess === 'c1' ? 'is-match' : 'is-miss');
  });

  it('Next sends `guess` with the picked token, and nothing else', () => {
    const dispatch = vi.fn();
    const view = mount('c1', dispatch);
    pickCard(view, guess);
    fireEvent.click(view.getByRole('button', { name: en['common.next'] }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'guess', value: guess }]]);
  });

  it('sounds: the riser on the pick, the point cue exactly once from the pick to Next (never before the pick), then only the Next tap', () => {
    const play = vi.spyOn(soundEngine, 'play');
    const view = mount('c1');
    play.mockClear();
    expect(play.mock.calls).toEqual([]);
    pickCard(view, guess);
    const heard = () => play.mock.calls.map(([id]) => id);
    expect(heard().filter((id) => id === 'sfx.reveal')).toHaveLength(1);
    fireEvent.click(view.getByRole('button', { name: en['common.next'] }));
    expect(heard().filter((id) => id.startsWith('sfx.point'))).toEqual([landing]);
    expect(heard().filter((id) => id === 'sfx.tap')).toHaveLength(1); // Next's own tap
  });
});

describe('GuessReveal, a choice question: the pick is made once', () => {
  it('two different cards in the same tick: the first is the pick, and it is the one Next sends', () => {
    const dispatch = vi.fn();
    const view = mount('c1', dispatch);
    const first = view.getByRole('button', { name: cardName(0) });
    const second = view.getByRole('button', { name: cardName(1) });
    act(() => {
      first.click();
      second.click();
    });
    expect(view.getByText(en['judge.auto.miss'])).toBeInTheDocument();
    expect(view.queryByText(en['judge.auto.match'])).toBeNull();
    fireEvent.click(view.getByRole('button', { name: en['common.next'] }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'guess', value: 'c0' }]]);
  });

  it('a second tap on a card after the pick changes nothing (the cards are no longer buttons)', () => {
    const view = mount('c1');
    pickCard(view, 'c0');
    const before = view.container.innerHTML;
    for (const token of ['c0', 'c1', 'c2']) fireEvent.click(view.container.querySelector(`.cb-choice[data-token="${token}"]`)!);
    expect(view.container.innerHTML).toBe(before);
  });
});

describe('GuessReveal, a choice question: in French', () => {
  it('reads the lead, the verdict and the card names in French', () => {
    const view = mount('c1', vi.fn(), 'fr');
    expect(view.getByText(interpolate(fr['guess.turn'], { name: 'Bo', partner: 'Ana' }))).toBeInTheDocument();
    pickCard(view, 'c1');
    expect(view.getByText(fr['judge.auto.match'])).toBeInTheDocument();
    expect(view.container.querySelector('.cb-choice[data-token="c1"]')?.getAttribute('aria-label')).toContain(
      interpolate((fr as Record<string, string>)['choice.answer']!, { name: 'Ana' }),
    );
  });
});

describe('green on purpose: the other guess screens are as they were', () => {
  const mountType = (type: 'open' | 'yes_no' | 'who_of_two', truth?: string) =>
    renderScreen(<GuessReveal game={gameWithCard('guess', type, truth)} question={classicQuestion(type)} dispatch={() => {}} />);

  it('open: the hint and REVEAL, no ChoiceList, no choice card class', () => {
    const { container, getByText, getByRole } = mountType('open');
    expect(getByText(en['guess.outloud'])).toBeInTheDocument();
    expect(getByRole('button', { name: /reveal/i })).toBeInTheDocument();
    expect(container.querySelector('.cb-choice-list, .cb-flash-card--choice')).toBeNull();
  });

  it.each([['yes_no', 'yes', /no/i, 'Yes'], ['who_of_two', 'p1', /Ana/, 'Bo']] as const)('%s: two buttons, then the reveal card (no ChoiceList)', (type, truth, button, real) => {
    const { container, getByRole } = mountType(type, truth);
    expect(container.querySelector('.cb-answers')).not.toBeNull();
    expect(container.querySelector('.cb-choice-list')).toBeNull();
    fireEvent.click(getByRole('button', { name: button }));
    expect(container.querySelector('.cb-flash-card--reveal')?.textContent).toBe(real);
    expect(container.querySelector('.cb-choice-list')).toBeNull();
  });
});
