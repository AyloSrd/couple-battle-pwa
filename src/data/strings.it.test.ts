import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fr } from './strings.fr';
import { it as italian } from './strings.it';

/**
 * P15 (web): the Italian UI strings (`strings.it.ts`, exported as `it` like `fr` / `en` / `es`). The text is the iPhone app's
 * `strings.it.ts` (main, 7f0955a) with exactly two differences, both pinned here:
 *  - the app has a key the web does not (`common.step`): the web file has the key set of the web FR file, so it is left out;
 *  - `legal.body` follows the web's own legal rules (a "sito" in a "browser", the public support address; see `strings.legal.test.ts`).
 * Every other value is pinned by one hash (`SHARED_SHA256`), so a hand edit of the translation fails here and the file stays a copy.
 */

const dict = italian as Record<string, string>;
const frDict = fr as Record<string, string>;
const slots = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();

/** sha-256 of `JSON.stringify` of the [key, value] entries, keys sorted, WITHOUT `common.step` and `legal.body` (250 entries): the app's text. */
const SHARED_SHA256 = '18fc688235f4fc2f352107b91a7b087c1d0ee2e46ff723846ffeb789e268b898';
const SHARED_COUNT = 250;
const CONTACT = 'support.couple.battle' + '@gmail.com';
/** The app's legal text with its three differences applied, the same ones as in fr / en / es: the support address, "sito" for "app", "browser" for "iPhone". */
const LEGAL_BODY =
  'Couple Battle™ è un gioco in fase di sviluppo. Marchio e concept depositati dai suoi creatori. Contatto: ' + CONTACT + '. Questo sito non raccoglie nessun dato personale: tutto resta nel tuo browser.';

/**
 * Keys whose Italian value may equal the French one: the brand, mode and difficulty names (identical by design in fr / en / es),
 * the durations, and the digits. Anything else equal to FR is a French leftover. A value with no letter at all once its slots are
 * removed (emoji, digits) is tolerated without being listed.
 */
const SAME_AS_FR_ALLOWED: readonly string[] = [
  'app.name',
  'common.points.plus',
  'count.1',
  'count.2',
  'count.3',
  'diff.easy.name',
  'diff.hard.name',
  'diff.medium.name',
  'diff.mix.name',
  'final.mismatch',
  'howto.flash.name',
  'howto.flash.title',
  'mode.dilemma.dur',
  'mode.flash.dur',
  'mode.flash.name',
  'mode.ultime.dur',
  'results.stats.stage.flash',
];
const hasLetter = (value: string) => /\p{L}/u.test(value.replace(/\{\w+\}/g, ''));

/** {team} / {teams} is a team name that can be plural ("I Leoni"): no verb may agree with it. */
const NUMBER_NEUTRAL_KEYS = ['results.winner', 'score.leader', 'results.stat.synchro', 'results.tie'] as const;
const VERBS =
  'vince|vincono|stravince|stravincono|è|sono|ha|hanno|guida|guidano|conduce|conducono|comanda|comandano|domina|dominano|trionfa|trionfano|' +
  'conquista|conquistano|porta|portano|passa|passano|resta|restano|rimane|rimangono|batte|battono|va|vanno|sta|stanno|segna|segnano|prende|prendono|mena|menano|gioca|giocano|si';
const VERB_AFTER_TEAM = new RegExp(`\\{teams?\\}\\s+(?:(?:non|già|ora|subito|sempre|anche)\\s+)?(?:${VERBS})(?![\\p{L}])`, 'iu');

describe('strings.it.ts: shape', () => {
  it('exports `it` as a flat object of strings', () => {
    expect(typeof italian).toBe('object');
    expect(Object.values(dict).every((value) => typeof value === 'string')).toBe(true);
  });

  it('has exactly the key set of the web FR file (so no `common.step`, a key of the iPhone app only)', () => {
    expect(Object.keys(dict).sort()).toEqual(Object.keys(frDict).sort());
    expect('common.step' in dict).toBe(false);
  });

  it('keeps the {placeholders} of the FR value on every key (same slots, same number of them)', () => {
    const odd = Object.keys(frDict).filter((key) => slots(dict[key] ?? '') !== slots(frDict[key]!));
    expect(odd).toEqual([]);
  });

  it('has no empty or blank value', () => {
    const empty = Object.entries(dict).filter(([, value]) => value.trim() === '').map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it('has no value with leading, trailing or doubled spaces', () => {
    const odd = Object.entries(dict).filter(([, value]) => value !== value.trim() || / {2}/.test(value)).map(([key]) => key);
    expect(odd).toEqual([]);
  });
});

describe('strings.it.ts: the iPhone app\'s text, copied', () => {
  it('every value but `legal.body` is the app\'s (one hash over the 250 shared entries)', () => {
    const entries = Object.entries(dict).filter(([key]) => key !== 'common.step' && key !== 'legal.body').sort(([a], [b]) => (a < b ? -1 : 1));
    expect(entries).toHaveLength(SHARED_COUNT);
    expect(createHash('sha256').update(JSON.stringify(entries)).digest('hex')).toBe(SHARED_SHA256);
  });
});

describe('strings.it.ts: not French', () => {
  it('has no value equal to the FR value, except the allow-list (and values with no letter)', () => {
    const same = Object.keys(frDict).filter((key) => dict[key] === frDict[key] && hasLetter(frDict[key]!) && !SAME_AS_FR_ALLOWED.includes(key));
    expect(same).toEqual([]);
  });

  it('the allow-list only names keys that exist in FR (green on purpose: it cannot grow quietly)', () => {
    expect(SAME_AS_FR_ALLOWED.filter((key) => !(key in frDict))).toEqual([]);
    expect(new Set(SAME_AS_FR_ALLOWED).size).toBe(SAME_AS_FR_ALLOWED.length);
    expect(SAME_AS_FR_ALLOWED.length).toBeLessThanOrEqual(17);
  });
});

describe('strings.it.ts: legal.body (the web\'s own rules)', () => {
  it('is exactly the app text with the web differences: the support address, "sito", "browser"', () => {
    expect(dict['legal.body']).toBe(LEGAL_BODY);
  });

  it('gives the one address of the web, and no other', () => {
    const body = dict['legal.body'] ?? '';
    expect(body.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)).toEqual([CONTACT]);
  });

  it('says the data stays in the browser of a site, never an app or an iPhone', () => {
    const body = dict['legal.body'] ?? '';
    expect(body).toMatch(/\bsito\b/i);
    expect(body).toMatch(/browser/i);
    expect(body).toMatch(/nessun dato/i);
    expect(body).not.toMatch(/iphone/i);
    expect(body).not.toMatch(/\bapp\b|applicazione/i);
  });

  it('is not the French text', () => {
    expect(dict['legal.body']).not.toBe(frDict['legal.body']);
  });
});

describe('strings.it.ts: {team} strings are number-neutral', () => {
  const teamKeys = Object.keys(frDict).filter((key) => /\{teams?\}/.test(frDict[key]!));

  it('the keys pinned by name all carry {team} / {teams} in FR (green on purpose: the pinned list stays true)', () => {
    expect(NUMBER_NEUTRAL_KEYS.filter((key) => !teamKeys.includes(key))).toEqual([]);
  });

  it('the heuristic: it matches a verb right after the slot and nothing else', () => {
    expect('👑 {team} vince la battaglia!').toMatch(VERB_AFTER_TEAM);
    expect('{team} guida la classifica!').toMatch(VERB_AFTER_TEAM);
    expect('{team} è in testa!').toMatch(VERB_AFTER_TEAM);
    expect('{team} si aggiudica la battaglia!').toMatch(VERB_AFTER_TEAM);
    expect('{teams} hanno pareggiato').toMatch(VERB_AFTER_TEAM);
    expect('👑 Vittoria per {team}!').not.toMatch(VERB_AFTER_TEAM);
    expect('In testa: {team}!').not.toMatch(VERB_AFTER_TEAM);
    expect('Pareggio: {teams}!').not.toMatch(VERB_AFTER_TEAM);
    expect('Sintonia migliore: {team}').not.toMatch(VERB_AFTER_TEAM);
    expect('{team}, bravi!').not.toMatch(VERB_AFTER_TEAM);
  });

  it.each(NUMBER_NEUTRAL_KEYS)('%s: no verb directly after {team} / {teams}', (key) => {
    const value = dict[key] ?? '';
    expect(value).toMatch(/\{teams?\}/);
    expect(value).not.toMatch(VERB_AFTER_TEAM);
  });

  it('every other string with a team slot is held to the same rule', () => {
    const odd = teamKeys.filter((key) => VERB_AFTER_TEAM.test(dict[key] ?? ''));
    expect(odd).toEqual([]);
  });
});
