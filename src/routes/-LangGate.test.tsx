import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaveApiProvider, type TSaveApi } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { useT } from '@/shared/i18n';
import { LangGate } from './-LangGate';

const Probe: FC = () => <p>{useT()('common.yes')}</p>;

function mount(saveApi: TSaveApi) {
  const sound = createSoundNoopApi();
  const setEnabled = vi.spyOn(sound, 'setEnabled');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <SaveApiProvider api={saveApi}>
        <SoundApiProvider api={sound}>
          <LangGate>
            <Probe />
          </LangGate>
        </SoundApiProvider>
      </SaveApiProvider>
    </QueryClientProvider>,
  );
  return { setEnabled };
}

describe('LangGate', () => {
  it('opens on the default settings (FR, sound on) when the settings read fails', async () => {
    const api = createSaveMemoryApi();
    const failing: TSaveApi = {
      ...api,
      get: ((key) => (key === 'settings' ? Promise.reject(new Error('idb read failed')) : api.get(key))) as TSaveApi['get'],
    };
    const { setEnabled } = mount(failing);

    expect(await screen.findByText('Oui')).toBeInTheDocument();
    expect(setEnabled).toHaveBeenCalledWith(true);
  });

  it('uses the stored settings when the read succeeds', async () => {
    const { setEnabled } = mount(createSaveMemoryApi({ settings: { lang: 'en', sound: false } }));

    expect(await screen.findByText('Yes')).toBeInTheDocument();
    expect(setEnabled).toHaveBeenCalledWith(false);
  });
});
