import { afterEach, describe, expect, it, vi } from 'vitest';
import { warmMediaCache } from './warmMediaCache';

describe('warmMediaCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
