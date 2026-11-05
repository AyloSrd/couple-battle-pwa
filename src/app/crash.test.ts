import { describe, expect, it } from 'vitest';
import { fr } from '@/data/strings.fr';
import { es } from '@/data/strings.es';
import { crashCopy, renderCrashScreen } from './crash';

describe('crash screen copy', () => {
  it('follows the first supported browser language', () => {
    expect(crashCopy(['de-DE', 'es-MX', 'en']).title).toBe(es['crash.title']);
    expect(crashCopy(['EN-gb']).lang).toBe('en');
  });

  it('falls back to French', () => {
    expect(crashCopy(['de', 'it'])).toMatchObject({ lang: 'fr', title: fr['crash.title'], retry: fr['crash.retry'] });
    expect(crashCopy([]).lang).toBe('fr');
  });
});

describe('renderCrashScreen (bootstrap failed: plain DOM, no React)', () => {
  it('replaces the root with a title, the reassurance and a Retry button', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>half-rendered</p>';
    renderCrashScreen(root, ['fr']);
    expect(root.querySelector('h1')?.textContent).toBe(fr['crash.title']);
    expect(root.textContent).toContain(fr['crash.body']);
    expect(root.querySelector('button')?.textContent).toBe(fr['crash.retry']);
    expect(root.textContent).not.toContain('half-rendered');
  });
});
