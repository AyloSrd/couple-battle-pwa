import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { AboutView } from './index';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

function mount(lang: 'fr' | 'en') {
  render(
    <SoundApiProvider api={createSoundNoopApi()}>
      <LangProvider initialLang={lang}>
        <AboutView />
      </LangProvider>
    </SoundApiProvider>,
  );
}

describe('AboutView', () => {
  it('shows the credits, the version and the Ninou poster from the app base URL', () => {
    mount('en');
    expect(screen.getByText('A game by Ninou Games')).toBeInTheDocument();
    expect(screen.getByText(/^Version \d+\.\d+\.\d+$/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ninou Games poster' })).toHaveAttribute(
      'src',
      `${import.meta.env.BASE_URL}splash/ninou-poster.webp`,
    );
  });

  it('is localized', () => {
    mount('fr');
    expect(screen.getByRole('heading', { name: 'À propos' })).toBeInTheDocument();
    expect(screen.getByText('Un jeu signé Ninou Games')).toBeInTheDocument();
  });

  it('goes back to Settings', () => {
    mount('fr');
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }));
    expect(navigate).toHaveBeenCalledWith({ to: '/settings' });
  });
});
