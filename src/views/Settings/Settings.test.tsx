import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { es } from '@/data/strings.es';
import { LangProvider } from '@/shared/i18n';
import { SaveApiProvider, type TSaveApi } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { SettingsView } from './index';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

function mount(api: TSaveApi = createSaveMemoryApi()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <SaveApiProvider api={api}>
        <SoundApiProvider api={createSoundNoopApi()}>
          <LangProvider initialLang="en">
            <SettingsView />
          </LangProvider>
        </SoundApiProvider>
      </SaveApiProvider>
    </QueryClientProvider>,
  );
  return api;
}

describe('SettingsView', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('shows vibration on by default and switches it off, persisting the choice', async () => {
    const api = mount();
    const toggle = await screen.findByRole('switch', { name: 'Vibration' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(await api.get('settings')).toEqual({ lang: 'fr', sound: true, vibration: false });
  });

  it('leaves the sound switch independent of the vibration one', async () => {
    const api = mount();
    const sound = await screen.findByRole('switch', { name: 'Sound' });
    await waitFor(() => expect(sound).toBeEnabled());
    fireEvent.click(sound);
    await waitFor(() => expect(sound).toHaveAttribute('aria-checked', 'false'));
    expect(await api.get('settings')).toMatchObject({ sound: false, vibration: true });
  });

  it('offers every language and switches the screen to the one picked', async () => {
    mount();
    const spanish = await screen.findByRole('button', { name: 'Español' });
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(spanish);

    expect(spanish).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: es['settings.title'] })).toBeInTheDocument();
  });

  it('opens Legal and About from their list rows', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Legal notice' }));
    expect(navigate).toHaveBeenLastCalledWith({ to: '/legal' });
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(navigate).toHaveBeenLastCalledWith({ to: '/about' });
  });
});
