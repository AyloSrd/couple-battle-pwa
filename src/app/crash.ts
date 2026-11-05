import { fr } from '@/data/strings.fr';
import { en } from '@/data/strings.en';
import { es } from '@/data/strings.es';

const DICTS = { fr, en, es } as const;

/**
 * The crash screen's copy, picked from the browser languages (FR fallback). It needs no
 * provider and no saved settings: it must work when nothing else does.
 */
export function crashCopy(languages: readonly string[] = navigator.languages ?? [navigator.language]) {
  const lang = languages.map((l) => l.slice(0, 2).toLowerCase()).find((l): l is keyof typeof DICTS => l in DICTS) ?? 'fr';
  const dict = DICTS[lang];
  return { lang, title: dict['crash.title'], body: dict['crash.body'], retry: dict['crash.retry'], home: dict['crash.home'] };
}

/**
 * `bootstrap()` failed before React could render: plain DOM, no React, no provider. Retry
 * reloads; saved data is never touched here.
 */
export function renderCrashScreen(root: HTMLElement, languages?: readonly string[]): void {
  const copy = crashCopy(languages);
  const main = document.createElement('main');
  main.className = 'cb-page cb-crash';
  main.lang = copy.lang;
  const title = document.createElement('h1');
  title.className = 'cb-title';
  title.textContent = copy.title;
  const body = document.createElement('p');
  body.textContent = copy.body;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'cb-btn';
  retry.textContent = copy.retry;
  retry.addEventListener('click', () => window.location.reload());
  main.append(title, body, retry);
  root.replaceChildren(main);
}
