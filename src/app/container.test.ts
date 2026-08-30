import { describe, expect, it } from 'vitest';
import { createContainer } from './container';

describe('createContainer("memory")', () => {
  it('builds all four ports with no real backends', async () => {
    const c = await createContainer('memory');
    expect(c.questionsApi).toBeDefined();
    expect(c.saveApi).toBeDefined();
    expect(c.soundApi).toBeDefined();
    expect(c.wakeLockApi).toBeDefined();
  });

  it('serves the real JSON catalog (catalog is always JSON)', async () => {
    const c = await createContainer('memory');
    const all = await c.questionsApi.list({ lang: 'fr' });
    expect(all.length).toBe(1035);
    const whoOfTwo = await c.questionsApi.list({ lang: 'fr', types: ['who_of_two'] });
    expect(whoOfTwo.length).toBeGreaterThan(0);
    expect(whoOfTwo.every((q) => q.type === 'who_of_two')).toBe(true);
  });

  it('returns save defaults and the sound/wake-lock twins are inert', async () => {
    const c = await createContainer('memory');
    await expect(c.saveApi.get('settings')).resolves.toEqual({ lang: 'fr', sound: true });
    expect(() => c.soundApi.play('sfx.tap')).not.toThrow();
    await expect(c.wakeLockApi.request()).resolves.toBeUndefined();
    await expect(c.wakeLockApi.release()).resolves.toBeUndefined();
  });
});
