import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { es } from '@/data/strings.es';
import { renderScreen } from '@/test/renderScreen';
import { probeListeners } from '@/test/listenerProbe';
import { LangMenu } from './LangMenu';

const chip = () => screen.getByRole('button', { name: /^(Language|Langue|Idioma)$/ });

describe('Home LangMenu', () => {
  it('opens every language under the chip and switches to the one picked', () => {
    renderScreen(<LangMenu />, 'en');
    expect(chip()).toHaveTextContent('EN');
    expect(chip()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(chip());
    expect(chip()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Français' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Español' }));
    expect(screen.queryByRole('button', { name: 'Español' })).not.toBeInTheDocument();
    expect(chip()).toHaveTextContent('ES');
    expect(chip()).toHaveAccessibleName(es['settings.language']);
  });

  it('closes on Escape and on a tap outside, without changing the language', () => {
    renderScreen(<LangMenu />, 'fr');
    fireEvent.click(chip());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'English' })).not.toBeInTheDocument();
    expect(chip()).toHaveFocus();

    fireEvent.click(chip());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('button', { name: 'English' })).not.toBeInTheDocument();
    expect(chip()).toHaveTextContent('FR');
  });

  it('removes its document listeners when unmounted while open', () => {
    render(<div />).unmount(); // warm-up: React's one-time document registrations
    const probe = probeListeners();
    const { unmount } = renderScreen(<LangMenu />, 'en');
    fireEvent.click(chip());
    expect(probe.added()).toEqual(expect.arrayContaining(['pointerdown', 'keydown']));
    unmount();
    expect(probe.unbalanced()).toEqual([]);
    probe.restore();
  });
});
