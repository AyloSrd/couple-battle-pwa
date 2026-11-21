import type { TQuestion } from '@/shared/questions/domain/types';

/**
 * The bank rules, as a pure check over question banks keyed by language (FR is the reference). It returns the problems found
 * (empty = the bank is sound), so the real files and an in-memory fixture with good and bad rows are held to the SAME rules.
 *  - every language has the same ids, in the same order, with the same theme, difficulty, type and (choice) option count as FR;
 *  - `{name}` contract of open / this_or_that / yes_no: no slot in `you`, exactly one in `name`; who_of_two: both the same, no slot;
 *  - choice: `question` at most 140 characters, exactly 3 options of at most 100, no `{name}` anywhere.
 */
export const CHOICE_QUESTION_MAX = 140;
export const CHOICE_OPTION_MAX = 100;

const SLOT = '{name}';
const count = (text: string) => text.split(SLOT).length - 1;

function rowProblems(lang: string, q: TQuestion): string[] {
  const at = (what: string) => `${lang} #${q.id}: ${what}`;
  if (q.type === 'choice') {
    const out: string[] = [];
    if (q.question.length > CHOICE_QUESTION_MAX) out.push(at('question too long'));
    if (q.options.length !== 3) out.push(at('not 3 options'));
    if (q.options.some((o) => o.length > CHOICE_OPTION_MAX)) out.push(at('option too long'));
    if (count(q.question) > 0 || q.options.some((o) => count(o) > 0)) out.push(at('{name} in a choice'));
    return out;
  }
  if (q.you.includes(SLOT)) return [at('{name} in you')];
  if (q.type === 'who_of_two') return q.name === q.you ? [] : [at('who_of_two: name differs from you')];
  return count(q.name) === 1 ? [] : [at('name needs exactly one {name}')];
}

const shape = (q: TQuestion) => [q.id, q.theme, q.difficulty, q.type, q.type === 'choice' ? q.options.length : 0];

export function bankProblems(banks: Record<string, TQuestion[]> & { fr: TQuestion[] }): string[] {
  const out: string[] = [];
  const reference = banks.fr.map(shape);
  for (const [lang, rows] of Object.entries(banks)) {
    if (lang !== 'fr' && JSON.stringify(rows.map(shape)) !== JSON.stringify(reference)) {
      out.push(`${lang}: ids, order, theme, difficulty, type or option count differ from fr`);
    }
    for (const q of rows) out.push(...rowProblems(lang, q));
  }
  return out;
}
