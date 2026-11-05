import { fr } from '@/data/strings.fr';
import { en } from '@/data/strings.en';
import { es } from '@/data/strings.es';

const DICTS = { fr, en, es } as const;

/** Crash copy from the browser languages (FR fallback): no provider, no settings — it must work
 *  when nothing else does. */
export function crashCopy(languages: readonly string[] = navigator.languages ?? [navigator.language]) {
  const lang = languages.map((l) => l.slice(0, 2).toLowerCase()).find((l): l is keyof typeof DICTS => l in DICTS) ?? 'fr';
  const dict = DICTS[lang];
  return { lang, title: dict['crash.title'], body: dict['crash.body'], retry: dict['crash.retry'], home: dict['crash.home'] };
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]>) =>
  Object.assign(document.createElement(tag), props);

/** `bootstrap()` failed before React rendered: plain DOM. Retry reloads; saved data is untouched. */
export function renderCrashScreen(root: HTMLElement, languages?: readonly string[]): void {
  const copy = crashCopy(languages);
  const main = el('main', { className: 'cb-page cb-crash', lang: copy.lang });
  const retry = el('button', { type: 'button', className: 'cb-btn', textContent: copy.retry });
  retry.addEventListener('click', () => window.location.reload());
  main.append(el('h1', { className: 'cb-title', textContent: copy.title }), el('p', { textContent: copy.body }), retry);
  root.replaceChildren(main);
}
