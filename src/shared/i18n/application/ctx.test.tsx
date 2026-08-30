import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { LangProvider, useLang, useT } from './ctx';

const Probe: FC = () => {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <div>
      <span data-testid="value">{t('common.yes')}</span>
      <span data-testid="interp">{t('common.question', { n: 2, total: 5 })}</span>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang('en')}>to-en</button>
      <button onClick={() => setLang('fr')}>to-fr</button>
    </div>
  );
};

describe('useT / LangProvider', () => {
  it('renders the seeded language and flips instantly on setLang', () => {
    render(
      <LangProvider initialLang="fr">
        <Probe />
      </LangProvider>,
    );

    expect(screen.getByTestId('value')).toHaveTextContent('Oui');
    expect(screen.getByTestId('interp')).toHaveTextContent('Question 2/5');

    fireEvent.click(screen.getByText('to-en'));
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('value')).toHaveTextContent('Yes');

    fireEvent.click(screen.getByText('to-fr'));
    expect(screen.getByTestId('value')).toHaveTextContent('Oui');
  });

  it('calls onLangChange when the language changes', () => {
    const seen: string[] = [];
    render(
      <LangProvider initialLang="fr" onLangChange={(l) => seen.push(l)}>
        <Probe />
      </LangProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    expect(seen).toEqual(['en']);
  });
});
