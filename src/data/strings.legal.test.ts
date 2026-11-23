import { describe, expect, it } from 'vitest';
import { fr } from './strings.fr';
import { en } from './strings.en';
import { es } from './strings.es';
import { it as italian } from './strings.it';

/**
 * The web's legal screen copy, in every language (P15 adds Italian). The web is a SITE that keeps its data in the player's BROWSER and gives the
 * owner's own address; the iPhone app says "app", "iPhone" and a dedicated support address instead. The rules are the same in each language.
 */

const CONTACT = 'aylo.srd' + '@gmail.com';
const APP_CONTACT = 'support.couple.battle' + '@gmail.com';
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

  it.each(codes)('%s: gives the owner\'s own address, and no other', (code) => {
    expect(body(code).match(EMAIL_LIKE)).toEqual([CONTACT]);
    expect(body(code)).not.toContain(APP_CONTACT);
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
