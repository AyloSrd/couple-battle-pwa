import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { fr } from '@/data/strings.fr';
import { en } from '@/data/strings.en';
import { PRIVACY_URL } from '@/shared/legal';
import { renderScreen } from '@/test/renderScreen';
import { LegalView } from './index';

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const cases = [
  { lang: 'fr', dict: fr },
  { lang: 'en', dict: en },
] as const;

describe('LegalView privacy link', () => {
  it.each(cases)('$lang: is a link named by legal.privacy, to PRIVACY_URL, in a new tab, with noopener noreferrer', ({ lang, dict }) => {
    renderScreen(<LegalView />, lang);
    const link = screen.getByRole('link', { name: dict['legal.privacy'] });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', PRIVACY_URL);
    expect(link).toHaveAttribute('target', '_blank');
    const rel = (link.getAttribute('rel') ?? '').split(/\s+/);
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  it.each(cases)('$lang: comes after the body panel and is the only link', ({ lang, dict }) => {
    renderScreen(<LegalView />, lang);
    const body = screen.getByText(dict['legal.body']);
    const link = screen.getByRole('link', { name: dict['legal.privacy'] });
    expect(body.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('reuses the Settings navigation-row look (cb-mode cb-v-nav), not a new style', () => {
    renderScreen(<LegalView />, 'en');
    const link = screen.getByRole('link', { name: en['legal.privacy'] });
    expect(link).toHaveClass('cb-mode', 'cb-v-nav');
  });
});
