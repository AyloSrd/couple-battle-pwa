import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaveApiProvider, type TSaveApi } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { useLang, useT } from '@/shared/i18n';
import { LangGate } from './__root';

const Probe: FC = () => {
  const t = useT();
  const { lang } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="value">{t('common.yes')}</span>
    </div>
  );
};

describe('LangGate', () => {
  it('falls back to the FR defaults when the settings read rejects', async () => {
    const saveApi: TSaveApi = {
      ...createSaveMemoryApi(),
      get: vi.fn(() => Promise.reject(new Error('idb unavailable'))) as TSaveApi['get'],
    };
    const soundApi = { ...createSoundNoopApi(), setEnabled: vi.fn() };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <SaveApiProvider api={saveApi}>
          <SoundApiProvider api={soundApi}>
            <LangGate>
              <Probe />
            </LangGate>
          </SoundApiProvider>
        </SaveApiProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId('lang')).toHaveTextContent('fr');
    expect(screen.getByTestId('value')).toHaveTextContent('Oui');
    expect(saveApi.get).toHaveBeenCalledWith('settings');
    expect(soundApi.setEnabled).toHaveBeenCalledWith(true);
  });
});
