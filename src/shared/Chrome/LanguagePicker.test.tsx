import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { es } from '@/data/strings.es';
import { renderScreen } from '@/test/renderScreen';
import { probeListeners } from '@/test/listenerProbe';
import { expectSynced } from '@/test/expectSynced';
import { LanguagePicker } from './LanguagePicker';

const chip = () => screen.getByRole('button', { name: /^(Language|Langue|Idioma)$/ });

describe('LanguagePicker — menu (Home)', () => {
  it('opens every language under the chip and switches to the one picked (saved)', () => {
    const { app } = renderScreen(<LanguagePicker variant="menu" />, 'en');
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
    expect(app.store.get().profile.settings.lang).toBe('es');
    expectSynced(app.store, app.api);
  });

  it('closes on Escape and on a tap outside, without changing the language', () => {
    const { app } = renderScreen(<LanguagePicker variant="menu" />, 'fr');
    fireEvent.click(chip());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'English' })).not.toBeInTheDocument();
    expect(chip()).toHaveFocus();

    fireEvent.click(chip());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('button', { name: 'English' })).not.toBeInTheDocument();
    expect(chip()).toHaveTextContent('FR');
    expect(app.store.get().profile.settings.lang).toBe('fr');
  });

  it('removes its document listeners when unmounted while open', () => {
    render(<div />).unmount(); // warm-up: React's one-time document registrations
    const probe = probeListeners();
    const { unmount } = renderScreen(<LanguagePicker variant="menu" />, 'en');
    fireEvent.click(chip());
    expect(probe.added()).toEqual(expect.arrayContaining(['pointerdown', 'keydown']));
    unmount();
    expect(probe.unbalanced()).toEqual([]);
    probe.restore();
  });
});

describe('LanguagePicker — row (Settings)', () => {
  it('marks the current language and saves a pick; the current one writes nothing', () => {
    const { app } = renderScreen(<LanguagePicker variant="row" />, 'en');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    const before = app.storage.getItem('cb.profile');

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(app.storage.getItem('cb.profile')).toBe(before);

    fireEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute('aria-pressed', 'true');
    expect(app.store.get().profile.settings.lang).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
    expectSynced(app.store, app.api);
  });
});
