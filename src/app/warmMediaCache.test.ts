import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { warmMediaCache } from './warmMediaCache';

describe('warmMediaCache', () => {
  const controlled = (controller: object | null) =>
    Object.defineProperty(navigator, 'serviceWorker', { value: { controller }, configurable: true });

  beforeEach(() => {
    controlled({});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('does nothing while no service worker controls the page (no double download)', async () => {
    controlled(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await warmMediaCache('/splash/ninou.mp4');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('issues one full GET (no Range header) and drains the body', async () => {
    const arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer });
    vi.stubGlobal('fetch', fetchMock);

    await warmMediaCache('/splash/ninou.mp4');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/splash/ninou.mp4');
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  it('does not read the body of a failed response', async () => {
    const arrayBuffer = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, arrayBuffer }));
    await warmMediaCache('/splash/ninou.mp4');
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('swallows network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(warmMediaCache('/splash/ninou.mp4')).resolves.toBeUndefined();
  });
});
