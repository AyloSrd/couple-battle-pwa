import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANG_NAMES, LANGS } from '@/shared/i18n';

/**
 * P15: a language cannot be half added. For every code in `LANGS` there must be a strings file, a bank file, a name, and an entry in each place
 * that lists the languages by hand (the i18n context, the crash copy, the questions loader). Adding a code to `Lang` without the rest fails here,
 * with the missing piece named. The sources are read as text: the loader and the crash copy do not export their tables.
 */

const SRC = path.resolve(__dirname, '..');
const read = (relative: string) => readFileSync(path.join(SRC, relative), 'utf8');
const stringsOf = (code: string) => `data/strings.${code}.ts`;
const bankOf = (code: string) => `data/questions.${code}.json`;

/** The `DICTS` table of a file: the text of its object literal. */
function dictsOf(relative: string): string {
  const match = /DICTS[^=]*=\s*\{([^}]*)\}/.exec(read(relative));
  if (!match) throw new Error(`no DICTS table in ${relative}`);
  return match[1]!;
}
const keysOf = (table: string) => table.split(',').map((entry) => entry.split(':')[0]!.trim()).filter(Boolean);

describe('the locales are complete', () => {
  it('has at least the four shipped languages (a guard on this test itself)', () => {
    expect(LANGS.length).toBeGreaterThanOrEqual(4);
    expect(LANGS).toContain('it');
  });

  it.each([...LANGS])('%s: has its strings file, its bank file and its name', (code) => {
    expect({ code, strings: existsSync(path.join(SRC, stringsOf(code))) }).toEqual({ code, strings: true });
    expect({ code, bank: existsSync(path.join(SRC, bankOf(code))) }).toEqual({ code, bank: true });
    expect(LANG_NAMES[code]).toEqual(expect.any(String));
    expect(LANG_NAMES[code].trim()).not.toBe('');
  });

  it('every strings file and every bank file on disk belongs to a language of LANGS (no orphan locale)', () => {
    const codes = (prefix: string, suffix: string) =>
      readdirSync(path.join(SRC, 'data'))
        .filter((f) => f.startsWith(prefix) && f.endsWith(suffix) && !f.includes('.test.') && !f.includes('baseline'))
        .map((f) => f.slice(prefix.length, -suffix.length))
        .sort();
    expect(codes('strings.', '.ts')).toEqual([...LANGS].sort());
    expect(codes('questions.', '.json')).toEqual([...LANGS].sort());
  });

  it('every language has its own, distinct name', () => {
    const names = LANGS.map((code) => LANG_NAMES[code]);
    expect(new Set(names).size).toBe(LANGS.length);
  });

  it.each([
    ['the i18n context DICTS', 'shared/i18n/application/ctx.tsx'],
    ['the crash copy DICTS', 'app/crash.ts'],
  ])('%s has an entry for every language', (_label, file) => {
    expect(keysOf(dictsOf(file)).sort()).toEqual([...LANGS].sort());
  });

  it('the questions loader (TRawByLang and the static imports) loads every language from its own bank file', () => {
    const loader = read('shared/questions/api/json.ts');
    for (const code of LANGS) {
      expect({ code, type: new RegExp(`\\b${code}: unknown`).test(loader) }).toEqual({ code, type: true });
      expect({ code, imported: loader.includes(`@/data/questions.${code}.json`) }).toEqual({ code, imported: true });
    }
  });

  it('the saved settings schema is built from LANGS, not from a hand-written list', () => {
    const types = read('shared/save/domain/types.ts');
    expect(types).not.toMatch(/z\.enum\(\[\s*Lang\./);
    expect(types).toMatch(/LANGS/);
  });
});
