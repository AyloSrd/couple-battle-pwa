import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bankProblems } from '@/test/bankRules';
import type { TQuestion } from '../domain/types';
import { createQuestionsJsonApi } from './json';

/**
 * P14 round 2, the content merge: the 60 choice questions (ids 1136 to 1195, delivered and validated as `question-data/choice`) are
 * appended to `src/data/questions.{fr,en,es}.json`, and nothing else in those files changes. Checked on the REAL files:
 *   - the first 1135 rows are the old bank, untouched: their canonical content (keys sorted, rows in file order) has the sha-256 it had at
 *     HEAD of round 1 (`BASE`), so any edit, reorder or reformat of a classic row fails here;
 *   - the rows after them are exactly the 60 choice rows, ids 1136 to 1195 in order, whose canonical content has the sha-256 of the
 *     delivered files (`CHOICE`), so the builder appends the delivery as it is;
 *   - the loader serves them (schema), and the bank rules of round 1 (`bankProblems`) report nothing.
 */

const LANGS = ['fr', 'en', 'es'] as const;
const BASE_ROWS = 1135;

/** sha-256 of the canonical JSON of the first 1135 rows, at HEAD of round 1 (f889981). */
const BASE: Record<(typeof LANGS)[number], string> = {
  fr: 'c207bedd227fc0d9dccca5f6fd67de0ba64d206d6e79dd7e20dc578ebb25d380',
  en: '2c96deaab3fb7bdc21213719ed4c8416b72422a85fba8c799a4bb4d33543c086',
  es: '0afce96e51bb1e783448d136c7d4ff19007d7b030b6bb1db732033ee4678aec7',
};
/** sha-256 of the canonical JSON of the 60 delivered choice rows. */
const CHOICE: Record<(typeof LANGS)[number], string> = {
  fr: '88a1a93bcfd5c199a13919dcc8ea62cd16234960526a9926c9e45327714742f8',
  en: '8a6544367f74af207b1435e178d031bf9e51d26be177e50380490e1b5ae7ba7b',
  es: 'f91f3edeadbce148c768662b218eb5a7846d8844062d9b810ea52bdc893bbb89',
};

/** sha-256 of the BYTES of each file after the merge: the web's files are byte-identical to the iPhone app's (branch p14-choice-questions):
 *  the old rows untouched, the 60 choice rows appended, `JSON.stringify(rows, null, 1)` with no trailing newline (the existing layout). */
const FILE: Record<(typeof LANGS)[number], string> = {
  fr: 'e135bb2d7db6312089a4f9cb2be80fc12ae29462af4a36dd6b8066b442f25bbd',
  en: 'f33f1a8a0c403e3d1172629af9aa501002d5f7c4b5721f473f369b48e9694352',
  es: '82f3fb5ac8e03b8f816e67314ed5b883cc5114202e582ad34cbb41ef1374035e',
};
/** `handoff/` holds the ORIGINAL 1,035-row FR and EN inputs (no ES) and is never edited (CLAUDE.md, BRIEF.md: `src/data` is the source of
 *  truth and has moved past it). These are the hashes they have today: the merge must leave them alone. */
const HANDOFF: Record<'fr' | 'en', string> = {
  fr: '8b6c1ee4135157ab1cbf59ede606332b033e86f509b5da6ed626c614c9b96dc5',
  en: 'f00325196a02eb218d12e05cd226a5a59c2592515eedb4e6d2b6691f4aaa4279',
};
const sha256Bytes = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value !== null && typeof value === 'object'
      ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
      : JSON.stringify(value);
const sha256 = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');

const rawRows = (lang: string): { id: number; type: string }[] => JSON.parse(readFileSync(path.join(__dirname, '../../../data', `questions.${lang}.json`), 'utf8'));
const loaded = () => Object.fromEntries(LANGS.map((lang) => [lang, createQuestionsJsonApi().list({ lang })])) as Record<(typeof LANGS)[number], TQuestion[]>;

describe.each(LANGS)('the %s bank file after the merge', (lang) => {
  const rows = rawRows(lang);

  it('is byte-identical to the iPhone app\'s file', () => {
    expect(sha256Bytes(path.join(__dirname, '../../../data', `questions.${lang}.json`))).toBe(FILE[lang]);
  });

  it('keeps the 1135 classic rows byte for byte in content and order (the first 1135 rows hash as at HEAD)', () => {
    expect(sha256(rows.slice(0, BASE_ROWS))).toBe(BASE[lang]);
    expect(rows.slice(0, BASE_ROWS).some((row) => row.type === 'choice')).toBe(false);
    expect(rows.slice(0, BASE_ROWS).map((row) => row.id)).toEqual(Array.from({ length: BASE_ROWS }, (_, i) => i + 1));
  });

  it('then holds exactly 60 choice rows, ids 1136 to 1195 in order, the delivered content', () => {
    const added = rows.slice(BASE_ROWS);
    expect(added).toHaveLength(60);
    expect(added.map((row) => row.id)).toEqual(Array.from({ length: 60 }, (_, i) => 1136 + i));
    expect(added.every((row) => row.type === 'choice')).toBe(true);
    expect(sha256(added)).toBe(CHOICE[lang]);
  });

  it('has 60 choice rows in all and no other new row', () => {
    expect(rows.filter((row) => row.type === 'choice')).toHaveLength(60);
    expect(rows).toHaveLength(BASE_ROWS + 60);
  });
});

describe('the merged banks, served by the loader', () => {
  it('serve 60 choice questions in every language (the schema accepts every row)', () => {
    const banks = loaded();
    for (const lang of LANGS) {
      const choices = banks[lang].filter((q) => q.type === 'choice');
      expect({ lang, ids: choices.map((q) => q.id) }).toEqual({ lang, ids: Array.from({ length: 60 }, (_, i) => 1136 + i) });
      expect(banks[lang]).toHaveLength(BASE_ROWS + 60);
    }
  });

  it('pass the bank rules of round 1: same ids, order, theme, difficulty, type and option count as FR; limits 140 / 100; no {name} in a choice', () => {
    expect(bankProblems(loaded())).toEqual([]);
  });

  it('draw the choice pool from the real files: filtering by type gives the 60 in each language', () => {
    for (const lang of LANGS) expect(createQuestionsJsonApi().list({ lang, types: ['choice'] })).toHaveLength(60);
  });
});

describe('handoff/ stays as delivered', () => {
  it.each(['fr', 'en'] as const)('handoff/data/questions.%s.json is untouched (no choice rows, no edit in place)', (lang) => {
    expect(sha256Bytes(path.join(process.cwd(), 'handoff/data', `questions.${lang}.json`))).toBe(HANDOFF[lang]);
  });
});
