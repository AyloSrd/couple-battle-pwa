import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaveApiProvider } from '../provider';
import { createSaveMemoryApi } from '../api/memory';
import type { TSaveApi } from '../api';
import { useGetSave } from './queries';
import { usePutSave } from './mutations';

function renderWithSave(ui: ReactNode, api: TSaveApi = createSaveMemoryApi()) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <SaveApiProvider api={api}>{ui}</SaveApiProvider>
    </QueryClientProvider>,
  );
}

const SettingsProbe: FC = () => {
  const query = useGetSave('settings');
  const put = usePutSave('settings');
  if (!query.data) return <span>loading</span>;
  const settings = query.data;
  return (
    <div>
      <span data-testid="lang">{settings.lang}</span>
      <span data-testid="sound">{String(settings.sound)}</span>
      <button onClick={() => put.mutate({ ...settings, sound: false })}>mute</button>
    </div>
  );
};

describe('save queries + mutations (memory adapter)', () => {
  it('reads defaults then round-trips a mutation', async () => {
    renderWithSave(<SettingsProbe />);

    expect(await screen.findByTestId('lang')).toHaveTextContent('fr');
    expect(screen.getByTestId('sound')).toHaveTextContent('true');

    fireEvent.click(screen.getByText('mute'));

    await screen.findByText('false');
    expect(screen.getByTestId('sound')).toHaveTextContent('false');
  });

  it('reflects a seeded fixture', async () => {
    renderWithSave(<SettingsProbe />, createSaveMemoryApi({ settings: { lang: 'en', sound: false } }));
    expect(await screen.findByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('sound')).toHaveTextContent('false');
  });
});
