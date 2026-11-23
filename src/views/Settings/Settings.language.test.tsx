import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { fr } from '@/data/strings.fr';
import { it as italian } from '@/data/strings.it';
import { LANG_NAMES, LANGS } from '@/shared/i18n';
import { expectSynced } from '@/test/expectSynced';
import { renderWithApp } from '@/test/renderApp';
import { SettingsView } from './index';

/**
 * P15, picker option B (owner, 2026-11-23): in Settings the label "Langue" / "Lingua" sits on its own line on top of the language card, and the
 * four pills sit in ONE row below it with equal widths. vitest runs with `css: false`, so this pins the STRUCTURE and the class names, plus a
 * read of the stylesheet text for the two things that make the layout (a stacked card, pills that share the row):
 *  - the language card is the only row with the modifier `cb-v-row--stack` (the sound and vibration rows keep the side-by-side layout);
 *  - inside it, in this order: the label block `.cb-v-row-text` (alone on its line), then the pills' container `.cb-v-row-ctl`, whose children
 *    are exactly the four `.cb-lang-pill` buttons (FR, EN, ES, IT);
 *  - view.css: a rule for `.cb-v-row--stack` with `flex-direction: column` and a stretching cross axis (no `align-items: center` / flex-start);
 *  - a `.cb-lang-pill` rule (chrome.css or view.css) with `flex: 1` (equal shares), and no `min-width` above 56px (four pills + 3 gaps of 8 fit a 320 phone).
 */

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const SRC = path.resolve(__dirname, '..', '..');
const css = (relative: string) => readFileSync(path.join(SRC, relative), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
type TRule = { selector: string; body: string };
const rulesOf = (source: string): TRule[] => [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));
const declared = (rule: TRule, property: string) => new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`).exec(rule.body)?.[1]?.trim();

const card = () => document.querySelector('.cb-v-row--stack') as HTMLElement;

beforeEach(() => {
  navigate.mockClear();
});

describe.each([
  ['en', en],
  ['fr', fr],
  ['it', italian],
] as const)('Settings, the language card (%s)', (lang, dict) => {
  it('is the one stacked card: the other rows (sound, vibration) are not', () => {
    renderWithApp(<SettingsView />, { lang });
    expect(document.querySelectorAll('.cb-v-row--stack')).toHaveLength(1);
    expect(card()).toHaveClass('cb-card', 'cb-v-row');
    expect(card().textContent).toContain(dict['settings.language']);
    expect(screen.getByRole('switch', { name: dict['settings.sound'] }).closest('.cb-v-row')).not.toHaveClass('cb-v-row--stack');
    expect(screen.getByRole('switch', { name: dict['settings.vibration'] }).closest('.cb-v-row')).not.toHaveClass('cb-v-row--stack');
  });

  it('holds the label on its own line first, then the four pills in one container', () => {
    renderWithApp(<SettingsView />, { lang });
    const children = [...card().children];
    expect(children).toHaveLength(2);
    expect(children[0]).toHaveClass('cb-v-row-text');
    expect(children[0]!.textContent).toBe(dict['settings.language']);
    expect(children[0]!.querySelector('button')).toBeNull();
    expect(children[1]).toHaveClass('cb-v-row-ctl');
    const pills = [...children[1]!.children];
    expect(pills.map((pill) => pill.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON', 'BUTTON']);
    expect(pills.map((pill) => pill.textContent)).toEqual(['FR', 'EN', 'ES', 'IT']);
    expect(pills.map((pill) => pill.getAttribute('aria-label'))).toEqual(LANGS.map((code) => LANG_NAMES[code]));
    for (const pill of pills) expect(pill).toHaveClass('cb-lang-pill');
  });
});

describe('Settings, picking Italian', () => {
  it('switches the whole screen to Italian, keeps the card stacked, marks the Italiano pill, saves it and sets <html lang="it">', () => {
    const { app } = renderWithApp(<SettingsView />, { lang: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Italiano' }));
    expect(screen.getByRole('heading', { name: italian['settings.title'] })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italiano' })).toHaveAttribute('aria-pressed', 'true');
    expect(card().firstElementChild!.textContent).toBe(italian['settings.language']);
    expect(italian['settings.language']).toBe('Lingua');
    expect(screen.getByRole('switch', { name: italian['settings.sound'] })).toBeInTheDocument();
    expect(app.store.get().profile.settings.lang).toBe('it');
    expect(document.documentElement.lang).toBe('it');
    expectSynced(app.store, app.api);
  });

  it('offers four pills in all (the old three-pill expectation is gone)', () => {
    renderWithApp(<SettingsView />, { lang: 'it' });
    expect(card().querySelectorAll('.cb-lang-pill')).toHaveLength(4);
  });
});

describe('Settings, the layout in the stylesheets (css is off in vitest: read as text)', () => {
  it('view.css stacks the card: a `.cb-v-row--stack` rule with a column direction, and a cross axis that stretches', () => {
    const rules = rulesOf(css('views/Settings/view.css')).filter((rule) => /\.cb-v-row--stack(?![\w-])/.test(rule.selector) && !/cb-v-row-ctl|cb-lang-pill|cb-v-row-text/.test(rule.selector));
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((rule) => declared(rule, 'flex-direction') === 'column')).toBe(true);
    for (const rule of rules) expect(['center', 'flex-start', 'start', 'flex-end', 'end']).not.toContain(declared(rule, 'align-items'));
  });

  it('the pills\' container takes the full width of the stacked card (no auto margin pushing it right)', () => {
    const rules = rulesOf(css('views/Settings/view.css')).filter((rule) => /\.cb-v-row--stack[^{,]*\.cb-v-row-ctl/.test(rule.selector));
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((rule) => declared(rule, 'margin-left') === '0' || declared(rule, 'width') === '100%' || declared(rule, 'align-self') === 'stretch' || declared(rule, 'flex') !== undefined)).toBe(true);
    for (const rule of rules) expect(declared(rule, 'margin-left')).not.toBe('auto');
  });

  it('every `.cb-lang-pill` takes an equal share of the row (`flex: 1`) and none asks for more than 56px', () => {
    const rules = [...rulesOf(css('shared/Chrome/chrome.css')), ...rulesOf(css('views/Settings/view.css'))].filter((rule) => /\.cb-lang-pill(?![\w-])/.test(rule.selector));
    expect(rules.some((rule) => /^1(?:\s+1)?(?:\s+0(?:%|px)?)?$/.test(declared(rule, 'flex') ?? ''))).toBe(true);
    for (const rule of rules) {
      const min = declared(rule, 'min-width');
      if (min !== undefined) expect(Number.parseFloat(min)).toBeLessThanOrEqual(56);
    }
  });

  it('the pill rule keeps the one shape of the other pills (height token, md radius)', () => {
    const rules = rulesOf(css('shared/Chrome/chrome.css')).filter((rule) => /\.cb-btn\.cb-lang-pill/.test(rule.selector));
    expect(rules.some((rule) => declared(rule, 'min-height') === 'var(--cb-h-btn-sec)' && declared(rule, 'border-radius') === 'var(--cb-r-md)')).toBe(true);
  });
});
