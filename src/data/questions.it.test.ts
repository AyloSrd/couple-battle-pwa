import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ZQuestionSchema } from '@/shared/questions/domain/types';
import { flagParticiples, IT_RULES, validateTranslatedBank } from '@/test/bankIt';

/**
 * P15 (web): the Italian bank is the iPhone app's `questions.it.json` (main, 7f0955a) copied as it is: 1195 rows, the same ids as FR.
 * Read with `fs`: only the questions loader imports a bank (eslint `no-restricted-imports`). The byte pin lives in `json.choice.test.ts`
 * next to the fr / en / es pins; here the file is held to the validator ported from the app (`src/test/bankIt.ts`) against the web FR file.
 */

const IT_FILE = join(__dirname, 'questions.it.json');
const FR_FILE = join(__dirname, 'questions.fr.json');
const fr = () => ZQuestionSchema.array().parse(JSON.parse(readFileSync(FR_FILE, 'utf8')));
const bank = () => JSON.parse(readFileSync(IT_FILE, 'utf8')) as unknown[];

describe('questions.it.json', () => {
  it('is the iPhone app\'s file, byte for byte (sha-256)', () => {
    expect(createHash('sha256').update(readFileSync(IT_FILE)).digest('hex')).toBe('252fbdf744ebb94ab64963a006aa037e95093ca79e4bf4afa1a9d384155f0a45');
  });

  it('has the 1195 rows of FR', () => {
    expect(bank()).toHaveLength(1195);
    expect(bank()).toHaveLength(fr().length);
  });

  it('passes validateTranslatedBank against questions.fr.json with no problem', () => {
    const problems = validateTranslatedBank(bank(), fr(), IT_RULES).map((p) => `#${p.id} [${p.rule}] ${p.message}`);
    expect(problems).toEqual([]);
  });

  it('lists the rows to review for essere participles (never a failure)', () => {
    const flagged = flagParticiples(bank());
    if (flagged.length > 0) console.warn(`questions.it.json: ${flagged.length} row(s) to review for essere participles: ${flagged.join(', ')}`);
    expect(Array.isArray(flagged)).toBe(true);
  });
});
