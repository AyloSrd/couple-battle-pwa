import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { LangProvider, useLang, useT } from './ctx';
import type { TLang } from '../domain/types';

const Probe: FC = () => {
  const t = useT();
  const { lang } = useLang();
  return (
    <div>
      <span data-testid="value">{t('common.yes')}</span>
      <span data-testid="interp">{t('common.question', { n: 2, total: 5 })}</span>
      <span data-testid="lang">{lang}</span>
    </div>
  );
};

const tree = (lang: TLang) => (
  <LangProvider lang={lang}>
    <Probe />
  </LangProvider>
);

describe('useT / LangProvider', () => {
  it('renders the given language and flips as soon as its owner passes another one', () => {
    const { rerender } = render(tree('fr'));
    expect(screen.getByTestId('value')).toHaveTextContent('Oui');
    expect(screen.getByTestId('interp')).toHaveTextContent('Question 2/5');

    rerender(tree('en'));
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('value')).toHaveTextContent('Yes');

    rerender(tree('es'));
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
    expect(screen.getByTestId('value')).toHaveTextContent('Sí');
    expect(document.documentElement.lang).toBe('es');

    rerender(tree('fr'));
    expect(screen.getByTestId('value')).toHaveTextContent('Oui');
    expect(document.documentElement.lang).toBe('fr');
  });
});
