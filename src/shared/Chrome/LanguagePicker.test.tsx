import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { es } from '@/data/strings.es';
import { it as italian } from '@/data/strings.it';
import { LANG_NAMES, LANGS } from '@/shared/i18n';
import { renderScreen } from '@/test/renderScreen';
import { probeListeners } from '@/test/listenerProbe';
import { expectSynced } from '@/test/expectSynced';
import { LanguagePicker } from './LanguagePicker';

const chip = () => screen.getByRole('button', { name: /^(Language|Langue|Idioma|Lingua)$/ });

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

  it('lists the four languages by their own names, in LANGS order (fr, en, es, it), one entry each', () => {
    renderScreen(<LanguagePicker variant="menu" />, 'en');
    fireEvent.click(chip());
    const entries = within(screen.getByRole('list')).getAllByRole('button');
    expect(entries.map((entry) => entry.textContent)).toEqual(LANGS.map((code) => LANG_NAMES[code]));
    expect(entries.map((entry) => entry.textContent)).toEqual(['Français', 'English', 'Español', 'Italiano']);
    expect(entries.map((entry) => entry.getAttribute('lang'))).toEqual(['fr', 'en', 'es', 'it']);
  });

  it('Italiano switches to Italian (the chip reads IT, named in Italian, <html lang="it">) and saves it', () => {
    const { app } = renderScreen(<LanguagePicker variant="menu" />, 'en');
    fireEvent.click(chip());
    expect(screen.getByRole('button', { name: 'Italiano' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Italiano' }));
    expect(screen.queryByRole('button', { name: 'Italiano' })).not.toBeInTheDocument();
    expect(chip()).toHaveTextContent('IT');
    expect(chip()).toHaveAccessibleName(italian['settings.language']);
    expect(document.documentElement.lang).toBe('it');
    expect(app.store.get().profile.settings.lang).toBe('it');
    expectSynced(app.store, app.api);
  });

  it('with Italian current, Italiano is the pressed entry and the others are not', () => {
    renderScreen(<LanguagePicker variant="menu" />, 'it');
    expect(chip()).toHaveTextContent('IT');
    fireEvent.click(chip());
    expect(screen.getByRole('button', { name: 'Italiano' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false');
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

describe('LanguagePicker — row (Settings), four pills', () => {
  const pills = () => screen.getAllByRole('button');

  it('one pill per language in LANGS order: FR, EN, ES, IT, each named by its language, each a `cb-lang-pill`', () => {
    renderScreen(<LanguagePicker variant="row" />, 'en');
    expect(pills()).toHaveLength(4);
    expect(pills().map((pill) => pill.getAttribute('aria-label'))).toEqual(LANGS.map((code) => LANG_NAMES[code]));
    expect(pills().map((pill) => pill.textContent)).toEqual(['FR', 'EN', 'ES', 'IT']);
    for (const pill of pills()) expect(pill).toHaveClass('cb-lang-pill');
  });

  it('the pills are siblings in one container (the row can give them equal widths), and nothing else is in it', () => {
    renderScreen(<LanguagePicker variant="row" />, 'en');
    const parents = new Set(pills().map((pill) => pill.parentElement));
    expect(parents.size).toBe(1);
    expect([...parents][0]!.children).toHaveLength(4);
  });

  it('pressing IT saves Italian, selects the Italiano pill (gold, aria-pressed) and sets <html lang="it">', () => {
    const { app } = renderScreen(<LanguagePicker variant="row" />, 'en');
    expect(screen.getByRole('button', { name: 'Italiano' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Italiano' }));
    expect(screen.getByRole('button', { name: 'Italiano' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false');
    expect(app.store.get().profile.settings.lang).toBe('it');
    expect(document.documentElement.lang).toBe('it');
    expectSynced(app.store, app.api);
  });

  it('with Italian current, only the Italiano pill is pressed', () => {
    renderScreen(<LanguagePicker variant="row" />, 'it');
    expect(pills().map((pill) => pill.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'true']);
  });
});
