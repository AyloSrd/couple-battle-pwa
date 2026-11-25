import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { fr } from '@/data/strings.fr';
import { renderWithApp } from '@/test/renderApp';
import { Seating } from './Seating';

const couple = (n: number) => en['howto.couple'].replace('{n}', String(n));

describe('Seating', () => {
  it('is one spoken element: a single role=img named by the alt text', () => {
    renderWithApp(<Seating />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img', { name: en['howto.principles.split.alt'] })).toBeInTheDocument();
  });

  it('speaks the alt text in the saved language', () => {
    renderWithApp(<Seating />, { lang: 'fr' });
    expect(screen.getByRole('img', { name: fr['howto.principles.split.alt'] })).toBeInTheDocument();
  });

  it('labels the two sides and the two couples (labels live inside the one spoken element)', () => {
    renderWithApp(<Seating />);
    const root = screen.getByRole('img', { name: en['howto.principles.split.alt'] });
    for (const label of [en['howto.side.a'], en['howto.side.b'], couple(1), couple(2)]) {
      const hit = screen.getByText(label);
      expect(root.contains(hit), label).toBe(true);
    }
    expect(screen.queryByText('{n}')).toBeNull();
    expect(screen.queryByText(/\{n\}/)).toBeNull();
  });

  it('shows exactly four portraits, two per couple, each with its own art and none spoken on its own', () => {
    renderWithApp(<Seating />);
    const root = screen.getByRole('img', { name: en['howto.principles.split.alt'] });
    const imgs = [...root.querySelectorAll('img')];
    expect(imgs).toHaveLength(4);
    expect(document.querySelectorAll('img')).toHaveLength(4);
    for (const img of imgs) {
      expect(img.getAttribute('src'), 'portrait has art').toBeTruthy();
      expect(img.getAttribute('alt') ?? '').toBe('');
    }
    expect(new Set(imgs.map((img) => img.getAttribute('src'))).size).toBe(4);

    // Each couple label sits with its own two portraits, and not with the other couple's.
    const groupOf = (label: string) => {
      let node: HTMLElement | null = screen.getByText(label);
      while (node && node !== root && node.querySelectorAll('img').length === 0) node = node.parentElement;
      return node as HTMLElement;
    };
    const one = groupOf(couple(1));
    const two = groupOf(couple(2));
    expect(one.querySelectorAll('img')).toHaveLength(2);
    expect(two.querySelectorAll('img')).toHaveLength(2);
    expect(one.contains(screen.getByText(couple(2)))).toBe(false);
    expect(two.contains(screen.getByText(couple(1)))).toBe(false);
  });
});
