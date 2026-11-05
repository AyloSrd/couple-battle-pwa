import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { es } from '@/data/strings.es';
import { renderWithApp } from '@/test/renderApp';
import { expectSynced } from '@/test/expectSynced';
import { SettingsView } from './index';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

function mount() {
  const { app } = renderWithApp(<SettingsView />, { seed: { profile: { seenIds: [4, 8] } } });
  expectSynced(app.store, app.api);
  return app;
}

describe('SettingsView', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('shows vibration on by default and switches it off, saving the choice', () => {
    const app = mount();
    const toggle = screen.getByRole('switch', { name: 'Vibration' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(app.store.get().profile.settings).toEqual({ lang: 'en', sound: true, vibration: false });
    expectSynced(app.store, app.api);
  });

  it('leaves the sound switch independent of the vibration one', () => {
    const app = mount();
    const sound = screen.getByRole('switch', { name: 'Sound' });
    fireEvent.click(sound);
    expect(sound).toHaveAttribute('aria-checked', 'false');
    expect(app.store.get().profile.settings).toMatchObject({ sound: false, vibration: true });
    expectSynced(app.store, app.api);
  });

  it('offers every language and switches the screen to the one picked (saved)', () => {
    const app = mount();
    const spanish = screen.getByRole('button', { name: 'Español' });
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(spanish);

    expect(spanish).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: es['settings.title'] })).toBeInTheDocument();
    expect(app.store.get().profile.settings.lang).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expectSynced(app.store, app.api);
  });

  it('resets the seen questions after a confirm', () => {
    const app = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Reset seen questions' }));
    expect(app.store.get().profile.seenIds).toEqual([4, 8]); // nothing before the confirm
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(app.store.get().profile.seenIds).toEqual([]);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expectSynced(app.store, app.api);
  });

  it('opens Legal and About from their list rows', () => {
    const app = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Legal notice' }));
    expect(navigate).toHaveBeenLastCalledWith({ to: '/legal' });
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(navigate).toHaveBeenLastCalledWith({ to: '/about' });
    expectSynced(app.store, app.api);
  });
});
