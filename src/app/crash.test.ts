import { describe, expect, it } from 'vitest';
import { fr } from '@/data/strings.fr';
import { es } from '@/data/strings.es';
import { it as italian } from '@/data/strings.it';
import { LANGS } from '@/shared/i18n';
import { crashCopy, renderCrashScreen } from './crash';

describe('crash screen copy', () => {
  it('follows the first supported browser language', () => {
    expect(crashCopy(['de-DE', 'es-MX', 'en']).title).toBe(es['crash.title']);
    expect(crashCopy(['EN-gb']).lang).toBe('en');
  });

  it('speaks Italian to an Italian browser (and picks it over a later language)', () => {
    expect(crashCopy(['it-IT', 'en'])).toEqual({
      lang: 'it',
      title: italian['crash.title'],
      body: italian['crash.body'],
      retry: italian['crash.retry'],
      home: italian['crash.home'],
    });
    expect(crashCopy(['de', 'IT']).lang).toBe('it');
    expect(italian['crash.title']).not.toBe(fr['crash.title']);
  });

  it('answers in every language of LANGS, and each answer is that language\'s own text', () => {
    for (const lang of LANGS) {
      const copy = crashCopy([lang]);
      expect(copy.lang).toBe(lang);
      expect(copy.title.trim()).not.toBe('');
    }
    expect(new Set(LANGS.map((lang) => crashCopy([lang]).title)).size).toBe(LANGS.length);
  });

  it('falls back to French', () => {
    expect(crashCopy(['de', 'pt'])).toMatchObject({ lang: 'fr', title: fr['crash.title'], retry: fr['crash.retry'] });
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

  it('is in Italian for an Italian browser, and says so on the page (lang="it")', () => {
    const root = document.createElement('div');
    renderCrashScreen(root, ['it']);
    expect(root.querySelector('main')?.getAttribute('lang')).toBe('it');
    expect(root.querySelector('h1')?.textContent).toBe(italian['crash.title']);
    expect(root.querySelector('button')?.textContent).toBe(italian['crash.retry']);
  });
});
