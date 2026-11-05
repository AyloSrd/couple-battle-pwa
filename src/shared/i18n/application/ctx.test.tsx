import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type FC, type ReactNode } from 'react';
import { LangProvider, useLang, useT } from './ctx';
import type { TLang } from '../domain/types';

/** The shell's role: owns the language and feeds it back (the save store in the app). */
const Owner: FC<{ initial: TLang; children: ReactNode }> = ({ initial, children }) => {
  const [lang, setLang] = useState(initial);
  return (
    <LangProvider lang={lang} onLangChange={setLang}>
      {children}
    </LangProvider>
  );
};

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
      <button onClick={() => setLang('es')}>to-es</button>
    </div>
  );
};

describe('useT / LangProvider', () => {
  it('renders the given language and flips as soon as its owner follows setLang', () => {
    render(
      <Owner initial="fr">
        <Probe />
      </Owner>,
    );

    expect(screen.getByTestId('value')).toHaveTextContent('Oui');
    expect(screen.getByTestId('interp')).toHaveTextContent('Question 2/5');

    fireEvent.click(screen.getByText('to-en'));
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('value')).toHaveTextContent('Yes');

    fireEvent.click(screen.getByText('to-es'));
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
    expect(screen.getByTestId('value')).toHaveTextContent('Sí');
    expect(document.documentElement.lang).toBe('es');

    fireEvent.click(screen.getByText('to-fr'));
    expect(screen.getByTestId('value')).toHaveTextContent('Oui');
  });

  it('is controlled: setLang only reports the pick (once per real change); `lang` decides', () => {
    const seen: string[] = [];
    render(
      <LangProvider lang="fr" onLangChange={(l) => seen.push(l)}>
        <Probe />
      </LangProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    fireEvent.click(screen.getByText('to-fr')); // already the language: not reported
    expect(seen).toEqual(['en']);
    expect(screen.getByTestId('value')).toHaveTextContent('Oui'); // the owner did not follow
  });
});
