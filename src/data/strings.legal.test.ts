import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fr } from './strings.fr';
import { en } from './strings.en';
import { es } from './strings.es';
import { it as italian } from './strings.it';

/**
 * The web's legal screen copy, in every language (P15 adds Italian). The web is a SITE that keeps its data in the player's BROWSER; the iPhone app says "app", "iPhone". Both give the same public support address. The rules are the same in each language.
 */

const CONTACT = 'support.couple.battle' + '@gmail.com';
const EMAIL_LIKE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

const dicts = { fr, en, es, it: italian } as const;
type TCode = keyof typeof dicts;
const codes = Object.keys(dicts) as TCode[];
const body = (code: TCode) => (dicts[code] as Record<string, string>)['legal.body'] ?? '';

const SITE_AND_BROWSER: Record<TCode, RegExp[]> = {
  fr: [/\bsite\b/i, /navigateur/i],
  en: [/\bsite\b/i, /\bbrowser\b/i],
  es: [/\bsitio\b/i, /navegador/i],
  it: [/\bsito\b/i, /\bbrowser\b/i],
};
const NO_DATA: Record<TCode, RegExp> = { fr: /aucune donnée/i, en: /no personal data/i, es: /ningún dato/i, it: /nessun dato/i };
const NOT_THE_APP = /iphone|\bapp\b|application\b|aplicación|applicazione/i;

describe('legal.body, on the web', () => {
  it('the four languages are covered (a guard on this test itself)', () => {
    expect(codes).toEqual(['fr', 'en', 'es', 'it']);
  });

  it.each(codes)('%s: gives the public support address, and no other', (code) => {
    expect(body(code).match(EMAIL_LIKE)).toEqual([CONTACT]);
  });

  it.each(codes)('%s: speaks of a site and a browser', (code) => {
    expect(SITE_AND_BROWSER[code].filter((re) => !re.test(body(code))).map(String)).toEqual([]);
  });

  it.each(codes)('%s: says that no personal data is collected', (code) => {
    expect(body(code)).toMatch(NO_DATA[code]);
  });

  it.each(codes)('%s: never speaks of an app or an iPhone, and keeps the trademark sentence', (code) => {
    expect(body(code)).not.toMatch(NOT_THE_APP);
    expect(body(code)).toContain('Couple Battle™');
  });
});

const EXACT_BODY: Record<TCode, string> = {
  fr: 'Couple Battle™ : marque et concept déposés par ses créateurs. Contact : ' + CONTACT + '. Ce site ne collecte aucune donnée personnelle : tout reste dans ton navigateur.',
  en: 'Couple Battle™: trademark and concept belong to its creators. Contact: ' + CONTACT + '. This site collects no personal data: everything stays in your browser.',
  es: 'Couple Battle™: marca y concepto registrados por sus creadores. Contacto: ' + CONTACT + '. Este sitio no recopila ningún dato personal: todo se queda en tu navegador.',
  it: 'Couple Battle™: marchio e concept depositati dai suoi creatori. Contatto: ' + CONTACT + '. Questo sito non raccoglie nessun dato personale: tutto resta nel tuo browser.',
};
const IN_DEVELOPMENT: Record<TCode, RegExp> = { fr: /développement/i, en: /development/i, es: /desarrollo/i, it: /sviluppo/i };
const PRIVACY_LABEL: Record<TCode, string> = {
  fr: 'Politique de confidentialité',
  en: 'Privacy policy',
  es: 'Política de privacidad',
  it: 'Informativa sulla privacy',
};
const privacy = (code: TCode) => (dicts[code] as Record<string, string>)['legal.privacy'];

describe('legal.body, no longer "in development"', () => {
  it.each(codes)('%s: does not say the game is in development', (code) => {
    expect(body(code)).not.toMatch(IN_DEVELOPMENT[code]);
  });

  it.each(codes)('%s: is exactly the pinned text', (code) => {
    expect(body(code)).toBe(EXACT_BODY[code]);
  });
});

describe('legal.privacy (the link label)', () => {
  it.each(codes)('%s: is exactly the pinned label', (code) => {
    expect(privacy(code)).toBe(PRIVACY_LABEL[code]);
  });

  it('exists with the same key set in all four languages', () => {
    const sets = codes.map((code) => Object.keys(dicts[code]).sort());
    for (const keys of sets) expect(keys).toEqual(sets[0]);
    expect(codes.filter((code) => !('legal.privacy' in dicts[code]))).toEqual([]);
  });
});

describe('no personal address in src/', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
  const GMAIL = /[\w.+-]+@gmail\.com/gi;

  it('no file under src/ holds a gmail address other than the support address', () => {
    const offenders = files('src').flatMap((path) => {
      const found = (readFileSync(path, 'utf8').match(GMAIL) ?? []).filter((a) => a.toLowerCase() !== CONTACT);
      return found.length ? [path] : [];
    });
    expect(offenders).toEqual([]);
  });
});
