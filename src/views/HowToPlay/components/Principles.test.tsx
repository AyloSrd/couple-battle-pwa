import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { it as italian } from '@/data/strings.it';
import { renderWithApp } from '@/test/renderApp';
import { Principles } from './Principles';
import { PRINCIPLES } from '../domain/principles';

const dicts = { en, it: italian } as unknown as Record<string, Record<string, string>>;

/** The card of a principle: the nearest ancestor of its title heading that also holds its body text. */
function cardOf(title: string, body: string): HTMLElement {
  let node: HTMLElement | null = screen.getByRole('heading', { name: title });
  while (node && !node.textContent?.includes(body)) node = node.parentElement;
  if (!node) throw new Error(`no card for ${title}`);
  return node;
}

describe('Principles', () => {
  it('renders four titles as headings, in table order', () => {
    renderWithApp(<Principles />);
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(4);
    expect(headings.map((h) => h.textContent)).toEqual(PRINCIPLES.map((p) => en[p.title as keyof typeof en]));
    for (const h of headings) expect([2, 3]).toContain(Number(h.tagName.slice(1)));
  });

  it('shows each body text, one card per principle, in order', () => {
    renderWithApp(<Principles />);
    const cards = PRINCIPLES.map((p) => cardOf(en[p.title as keyof typeof en], en[p.body as keyof typeof en]));
    expect(new Set(cards).size).toBe(4); // four distinct cards
    for (let i = 1; i < cards.length; i += 1) {
      expect(cards[i - 1]!.compareDocumentPosition(cards[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    for (const p of PRINCIPLES) expect(screen.getAllByText(en[p.body as keyof typeof en])).toHaveLength(1);
  });

  it('shows the emoji badges on phone, roles and win; the split card holds the seating diagram, no other card does', () => {
    renderWithApp(<Principles />);
    const card = (id: string) => {
      const p = PRINCIPLES.find((x) => x.id === id)!;
      return cardOf(en[p.title as keyof typeof en], en[p.body as keyof typeof en]);
    };
    expect(card('phone')).toHaveTextContent('📱');
    expect(card('roles')).toHaveTextContent('🙈');
    expect(card('win')).toHaveTextContent('👑');
    const diagram = screen.getByRole('img', { name: en['howto.principles.split.alt'] });
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(card('split').contains(diagram)).toBe(true);
    for (const id of ['phone', 'roles', 'win']) expect(card(id).contains(diagram)).toBe(false);
  });

  it('is translated: Italian titles and bodies in an Italian session', () => {
    renderWithApp(<Principles />, { lang: 'it' });
    for (const p of PRINCIPLES) {
      expect(screen.getByRole('heading', { name: dicts.it![p.title]! })).toBeInTheDocument();
      expect(screen.getByText(dicts.it![p.body]!)).toBeInTheDocument();
    }
  });
});
