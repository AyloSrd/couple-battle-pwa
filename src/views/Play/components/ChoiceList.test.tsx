import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { fr } from '@/data/strings.fr';
import { interpolate } from '@/shared/i18n';
import { soundEngine } from '@/shared/sound';
import { renderScreen } from '@/test/renderScreen';
import { ChoiceList } from './ChoiceList';

/**
 * The ONE list of three answers that SecretAnswers (pick) and GuessReveal (pick, then result) share. CONTRACT for the builder:
 *
 *   <ChoiceList mode="pick"   choices={TChoice[]} onPick={(token) => void} sfx?={TSoundId | null} />
 *   <ChoiceList mode="result" choices={TChoice[]} truth={token} picked={token} truthName={string} pickedName={string} />
 *
 * `choices` is what `closedChoices` returns for a choice card: `{ token: 'c0' | 'c1' | 'c2', label: <option text> }`, in order; the letter
 * is its place (A, B, C). `sfx` (default 'sfx.tap'; null = silent) is the cue a tap plays ('sfx.lock' on the answer screen).
 *
 * DOM (file `ChoiceList.tsx`, its styles in `flash.css` or a CSS file it imports; no inline styles):
 *   root   `.cb-choice-list`  (pick: `role="group"`; result: `role="list"`)
 *   card   `.cb-choice` with `data-token="c0|c1|c2"`: pick a `<button type="button">` named "A. <text>" (aria-label); result a
 *          `<div role="listitem">` that is NOT a button, named by aria-label "A. <text>" then, when it has something to say, the
 *          `choice.answer` / `choice.guess` strings with the player's name (the answerer's tag adds "{name}'s answer", the guesser's
 *          "{name}'s guess"); a plain card is named exactly "C. <text>"
 *   inside `.cb-choice__letter` (the violet disc: the letter A / B / C), `.cb-choice__text` (the whole option text, wraps), in that
 *          order; in result mode `.cb-choice__tag` (a gold pill with a player's name; both players' tags on one card when they match)
 *   state  `.is-truth` the gold ring on the real answer; `.is-pick` the guess; `.is-match` on the pick when it IS the truth (mint),
 *          `.is-miss` on the pick when it is not (rose); a plain card has none of them.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const OPTIONS = ['The first answer', 'The second answer is long enough that it needs several lines to be read on a narrow phone, and it still must not be cut at all', 'Third'];
const CHOICES = OPTIONS.map((label, i) => ({ token: `c${i}`, label }));
const LETTERS = ['A', 'B', 'C'];
const nameOfCard = (i: number) => `${LETTERS[i]}. ${OPTIONS[i]}`;
const TOKENS = ['c0', 'c1', 'c2'];

const pick = (onPick = vi.fn(), sfx?: 'sfx.lock' | null) => ({ onPick, ...renderScreen(<ChoiceList mode="pick" choices={CHOICES} onPick={onPick} {...(sfx === undefined ? null : { sfx })} />) });
const result = (truth: string, picked: string, lang: 'en' | 'fr' = 'en') =>
  renderScreen(<ChoiceList mode="result" choices={CHOICES} truth={truth} picked={picked} truthName="Camille" pickedName="Alex" />, lang);

const card = (c: HTMLElement, token: string) => c.querySelector<HTMLElement>(`.cb-choice[data-token="${token}"]`)!;
const tagsOf = (c: HTMLElement, token: string) => [...card(c, token).querySelectorAll('.cb-choice__tag')].map((n) => n.textContent);
const labelOf = (c: HTMLElement, token: string) => card(c, token).getAttribute('aria-label') ?? '';
const ringed = (c: HTMLElement) => TOKENS.filter((t) => card(c, t).classList.contains('is-truth'));
const answerSays = (name: string) => interpolate((en as Record<string, string>)['choice.answer']!, { name });
const guessSays = (name: string) => interpolate((en as Record<string, string>)['choice.guess']!, { name });

describe('ChoiceList, pick mode', () => {
  it('is one column of three cards in order, each a real button named "A. <text>", "B. <text>", "C. <text>"', () => {
    const { container, getAllByRole } = pick();
    const list = container.querySelector('.cb-choice-list')!;
    expect(list).toBeTruthy();
    expect(list.getAttribute('role')).toBe('group');
    expect(getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([0, 1, 2].map(nameOfCard));
    expect([...list.querySelectorAll('.cb-choice')].map((n) => n.getAttribute('data-token'))).toEqual(TOKENS);
    for (const token of TOKENS) {
      expect(card(container, token).tagName).toBe('BUTTON');
      expect(card(container, token)).toHaveAttribute('type', 'button');
      expect(card(container, token)).toBeEnabled();
    }
  });

  it('a tap calls onPick with the token of that card, once per tap', () => {
    const { onPick, getByRole } = pick();
    fireEvent.click(getByRole('button', { name: nameOfCard(1) }));
    expect(onPick.mock.calls).toEqual([['c1']]);
    fireEvent.click(getByRole('button', { name: nameOfCard(2) }));
    fireEvent.click(getByRole('button', { name: nameOfCard(0) }));
    expect(onPick.mock.calls).toEqual([['c1'], ['c2'], ['c0']]);
  });

  it('the tap plays the cue it is given, and only that one; with none given, the kit tap; null is silent', () => {
    const play = vi.spyOn(soundEngine, 'play');
    const locked = pick(vi.fn(), 'sfx.lock');
    play.mockClear();
    fireEvent.click(locked.getByRole('button', { name: nameOfCard(0) }));
    expect(play.mock.calls.map(([id]) => id)).toEqual(['sfx.lock']);
    locked.unmount();
    const plain = pick();
    play.mockClear();
    fireEvent.click(plain.getByRole('button', { name: nameOfCard(0) }));
    expect(play.mock.calls.map(([id]) => id)).toEqual(['sfx.tap']);
    plain.unmount();
    const silent = pick(vi.fn(), null);
    play.mockClear();
    fireEvent.click(silent.getByRole('button', { name: nameOfCard(0) }));
    expect(play.mock.calls).toEqual([]);
  });

  it('every card is plain: no ring, no tag, no match / miss state', () => {
    const { container } = pick();
    for (const token of TOKENS) {
      const cls = card(container, token).classList;
      expect(['is-truth', 'is-pick', 'is-match', 'is-miss'].filter((c) => cls.contains(c))).toEqual([]);
      expect(tagsOf(container, token)).toEqual([]);
    }
  });

  it('the letter is in its own disc BEFORE the text: .cb-choice__letter holds A, B, C, .cb-choice__text the whole option', () => {
    const { container } = pick();
    TOKENS.forEach((token, i) => {
      const letter = card(container, token).querySelector('.cb-choice__letter')!;
      const text = card(container, token).querySelector('.cb-choice__text')!;
      expect(letter.textContent).toBe(LETTERS[i]);
      expect(text.textContent).toBe(OPTIONS[i]);
      expect(letter.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('wraps long text: no inline style, no truncation hint anywhere in the card (sizes and wrapping come from the stylesheet)', () => {
    const { container } = pick();
    for (const token of TOKENS) {
      for (const n of [card(container, token), ...card(container, token).querySelectorAll('*')]) {
        expect(n.getAttribute('style'), `${token} ${n.className}`).toBeNull();
        expect(n.getAttribute('title')).toBeNull();
      }
    }
  });
});

describe('ChoiceList, result mode', () => {
  it('a miss: the truth is ringed and says whose answer it is, the guess is rose and says whose guess it is, the third is plain', () => {
    const { container } = result('c1', 'c0');
    expect(ringed(container)).toEqual(['c1']);
    expect(TOKENS.filter((t) => card(container, t).classList.contains('is-miss'))).toEqual(['c0']);
    expect(TOKENS.filter((t) => card(container, t).classList.contains('is-match'))).toEqual([]);
    expect(TOKENS.filter((t) => card(container, t).classList.contains('is-pick'))).toEqual(['c0']);
    expect([tagsOf(container, 'c0'), tagsOf(container, 'c1'), tagsOf(container, 'c2')]).toEqual([['Alex'], ['Camille'], []]);
    expect(labelOf(container, 'c1').startsWith(nameOfCard(1))).toBe(true);
    expect(labelOf(container, 'c1')).toContain(answerSays('Camille'));
    expect(labelOf(container, 'c1')).not.toContain(guessSays('Alex'));
    expect(labelOf(container, 'c0').startsWith(nameOfCard(0))).toBe(true);
    expect(labelOf(container, 'c0')).toContain(guessSays('Alex'));
    expect(labelOf(container, 'c0')).not.toContain(answerSays('Camille'));
    expect(labelOf(container, 'c2')).toBe(nameOfCard(2));
  });

  it('a match: the one card is ringed AND mint, with both names, and says both', () => {
    const { container } = result('c2', 'c2');
    expect(ringed(container)).toEqual(['c2']);
    expect(TOKENS.filter((t) => card(container, t).classList.contains('is-match'))).toEqual(['c2']);
    expect(TOKENS.filter((t) => card(container, t).classList.contains('is-miss'))).toEqual([]);
    expect([tagsOf(container, 'c0'), tagsOf(container, 'c1')]).toEqual([[], []]);
    expect([...tagsOf(container, 'c2')].sort()).toEqual(['Alex', 'Camille']);
    expect(labelOf(container, 'c2').startsWith(nameOfCard(2))).toBe(true);
    expect(labelOf(container, 'c2')).toContain(answerSays('Camille'));
    expect(labelOf(container, 'c2')).toContain(guessSays('Alex'));
    expect(labelOf(container, 'c0')).toBe(nameOfCard(0));
    expect(labelOf(container, 'c1')).toBe(nameOfCard(1));
  });

  it.each([['c0', 'c1'], ['c0', 'c2'], ['c1', 'c0'], ['c2', 'c1']])('truth %s, guess %s: one ring on the truth, miss on the guess', (truth, picked) => {
    const { container } = result(truth, picked);
    expect(ringed(container)).toEqual([truth]);
    expect(TOKENS.filter((t) => card(container, t).classList.contains('is-miss'))).toEqual([picked]);
    expect(TOKENS.filter((t) => card(container, t).classList.contains('is-match'))).toEqual([]);
  });

  it('the strings come from the active language ("Réponse de Camille", "Choix de Alex")', () => {
    const { container } = result('c1', 'c0', 'fr');
    expect(labelOf(container, 'c1')).toContain(interpolate((fr as Record<string, string>)['choice.answer']!, { name: 'Camille' }));
    expect(labelOf(container, 'c0')).toContain(interpolate((fr as Record<string, string>)['choice.guess']!, { name: 'Alex' }));
  });

  it('keeps the root a list of three items, the letter disc and the full text of every answer', () => {
    const { container, getAllByRole } = result('c1', 'c0');
    expect(container.querySelector('.cb-choice-list')?.getAttribute('role')).toBe('list');
    const items = getAllByRole('listitem');
    expect(items).toHaveLength(3);
    items.forEach((item, i) => expect(item.getAttribute('aria-label')?.startsWith(nameOfCard(i))).toBe(true));
    TOKENS.forEach((token, i) => {
      expect(card(container, token).querySelector('.cb-choice__letter')?.textContent).toBe(LETTERS[i]);
      expect(card(container, token).querySelector('.cb-choice__text')?.textContent).toBe(OPTIONS[i]);
    });
  });

  it('is inert: no button at all, one named element per card; a click changes nothing', () => {
    const { container, queryAllByRole } = result('c1', 'c0');
    expect(queryAllByRole('button')).toEqual([]);
    expect(container.querySelectorAll('button')).toHaveLength(0);
    for (const token of TOKENS) {
      expect(card(container, token).getAttribute('role')).toBe('listitem');
      expect(card(container, token).getAttribute('aria-label')).toBeTruthy();
    }
    const before = container.innerHTML;
    for (const token of TOKENS) fireEvent.click(card(container, token));
    expect(container.innerHTML).toBe(before);
  });

  it('the tags are small pills with just the name in them', () => {
    const { container } = result('c1', 'c0');
    const tag = card(container, 'c1').querySelector('.cb-choice__tag')!;
    expect(tag.textContent).toBe('Camille');
    expect(within(card(container, 'c1')).getAllByText('Camille')).toHaveLength(1);
  });
});
