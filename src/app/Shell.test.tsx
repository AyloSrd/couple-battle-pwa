import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { fr } from '@/data/strings.fr';
import { soundEngine } from '@/shared/sound';
import { createSaveStore } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { STORAGE_KEYS } from '@/shared/save/api/localStorage';
import { createTestApp, TestProviders, type TTestApp } from '@/test/renderApp';
import { expectSynced, seedStorage } from '@/test/expectSynced';
import { NOTICE_MS, Shell } from './Shell';

function mount(app: TTestApp = createTestApp()) {
  render(
    <TestProviders app={app}>
      <Shell>
        <p>screen</p>
      </Shell>
    </TestProviders>,
  );
  return app;
}

describe('Shell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows nothing extra while saving works', () => {
    mount();
    expect(screen.getByText('screen')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('sound follows the saved setting', () => {
    const setEnabled = vi.spyOn(soundEngine, 'setEnabled');
    const app = mount();
    expect(setEnabled).toHaveBeenLastCalledWith(true);
    act(() => app.store.updateSettings({ sound: false }));
    expect(setEnabled).toHaveBeenLastCalledWith(false);
  });

  it('a failing write shows the retrying notice with Retry; Retry re-sends and the notice goes', () => {
    const app = mount();
    vi.spyOn(app.api, 'write').mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    act(() => app.store.updateSettings({ vibration: false }));
    expect(screen.getByRole('status')).toHaveTextContent(en['save.failing']);
    fireEvent.click(screen.getByRole('button', { name: en['save.retry'] }));
    expect(screen.queryByRole('status')).toBeNull();
    expectSynced(app.store, app.api);
  });

  it('dirty saves are re-sent when the page is hidden', () => {
    const app = mount();
    vi.spyOn(app.api, 'write').mockImplementationOnce(() => {
      throw new Error('locked');
    });
    act(() => app.store.updateSettings({ lang: 'es' }));
    expect(app.store.get().status).toBe('failing');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Reflect.deleteProperty(document, 'visibilityState');
    expect(app.store.get().status).toBe('ok');
    expectSynced(app.store, app.api);
  });

  it('a session without saving says so (and the notice can be closed)', () => {
    const base = createTestApp();
    const api = createSaveMemoryApi();
    mount({ ...base, store: createSaveStore(api, { ...api.load(), persistent: false }) });
    // a fresh memory store: default settings, so French
    expect(screen.getByRole('status')).toHaveTextContent(fr['save.memory']);
    fireEvent.click(screen.getByRole('button', { name: fr['common.close'] }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('"some settings were reset" shows once after boot, then goes away on its own', () => {
    const base = createTestApp();
    const api = createSaveMemoryApi(seedStorage({ raw: { [STORAGE_KEYS.profile]: 'not json' } }));
    const store = createSaveStore(api, api.load());
    mount({ ...base, store, api });
    expect(screen.getByRole('status')).toHaveTextContent(fr['save.profileReset']); // reset to defaults: French
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS);
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(store.get().issues).toEqual([]);
  });
});
