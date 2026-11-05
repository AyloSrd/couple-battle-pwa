import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithApp } from '@/test/renderApp';
import { SettingsView } from './index';

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

/** React installs its own one-shot `selectionchange` listener on the document and never removes it. */
const REACT_OWNED = new Set(['selectionchange']);

function balance(add: { mock: { calls: unknown[][] } }, remove: { mock: { calls: unknown[][] } }) {
  const net = new Map<string, number>();
  for (const [type] of add.mock.calls) net.set(String(type), (net.get(String(type)) ?? 0) + 1);
  for (const [type] of remove.mock.calls) net.set(String(type), (net.get(String(type)) ?? 0) - 1);
  return [...net].filter(([type, n]) => n !== 0 && !REACT_OWNED.has(type));
}


describe('SettingsView — leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('leaves no timer and no listener behind after the toast cycle and an unmount (StrictMode)', async () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');

    const view = renderWithApp(<SettingsView />, { strict: true });

    fireEvent.click(screen.getByRole('switch', { name: 'Vibration' }));

    // reset flow arms the toast timer; unmount while it is still pending
    fireEvent.click(screen.getByRole('button', { name: 'Reset seen questions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    // The one timer we own is the toast's: unmounting must cancel it.
    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(balance(winAdd, winRemove)).toEqual([]);
    expect(balance(docAdd, docRemove)).toEqual([]);
  });

  it('lets the toast expire on its own and then holds no timer', async () => {
    const view = renderWithApp(<SettingsView />, { strict: true });
    fireEvent.click(screen.getByRole('button', { name: 'Reset seen questions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2200);
    });
    expect(screen.queryByRole('status')).toBeNull();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
