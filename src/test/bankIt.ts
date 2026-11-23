import { ZQuestionSchema, type TQuestion } from '@/shared/questions/domain/types';

/**
 * Test support for the Italian question bank (P15 round I1): a PURE validator that holds a translated bank to the contract in
 * `.lavagna/italian.lavagna.md` ("Question translation"), and a non-failing review helper. It is test code on purpose: the builder
 * runs it on every translated batch (see `bankIt.run.test.ts`), and `src/data/questions.it.test.ts` runs it on the real file.
 *
 * `validateTranslatedBank(target, fr, rules)` returns every problem found (empty = sound), each with the row id (null when the
 * problem is not about one row), so a batch can be fixed row by row. Rules checked, per row unless said otherwise:
 *  - schema: parses with the real `ZQuestionSchema` and carries no key beyond the ones its type allows;
 *  - rows (whole bank): same ids, same order as FR; per row same theme, difficulty, type and, for `choice`, option count;
 *  - `{name}`: classic `you` has none; `who_of_two`: `name === you`; other classic types: exactly one `{name}` in `name`;
 *    `choice`: no `{name}` in `question` or options; no other `{...}` slot anywhere;
 *  - length: classic `you` / `name` within `rules.classic`; choice `question` <= 140, options <= 100;
 *  - format: classic fields end with `?` and have no space before it; no double / leading / trailing space, no tab or newline;
 *    only the straight apostrophe `'` (no curly single quote); no `"`; no curly “ ” (any row); « » are allowed (classic rows too)
 *    but must be balanced: every « has a » after it, no nesting, no stray »;
 *  - gender marks (`rules.genderMarks`) and French leftovers (`rules.frStopwords`, plus any value equal to its FR counterpart);
 *  - no duplicate classic `you` (or choice `question`) in the bank, except a pair FR itself duplicates;
 *  - no `@`.
 */

export type TBankRule =
  | 'schema'
  | 'ids'
  | 'order'
  | 'theme'
  | 'difficulty'
  | 'type'
  | 'options'
  | 'name-slot'
  | 'length'
  | 'format'
  | 'gender'
  | 'fr-leftover'
  | 'duplicate'
  | 'at-sign';

export type TBankProblem = { id: number | null; rule: TBankRule; message: string };

export type TBankRules = {
  /** Inclusive character range of a classic row's `you` and `name` (the raw text, `{name}` counted as 6). */
  classic: { min: number; max: number };
  choiceQuestionMax: number;
  choiceOptionMax: number;
  /** A text matching any of these carries a gender mark ("stato/a", "(a)", "lui/lei"). */
  genderMarks: readonly RegExp[];
  /** A text matching any of these is still French. */
  frStopwords: readonly RegExp[];
};

/** A word, not a substring: `\b` is ASCII-only in JS, so "è" and "più" need explicit letter lookarounds. */
const word = (source: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu');

export const IT_RULES: TBankRules = {
  classic: { min: 8, max: 140 },
  choiceQuestionMax: 140,
  choiceOptionMax: 100,
  genderMarks: [
    /\((?:a|o|e|i)\)/i, //                      stato(a), bravo(a), (e)
    /(?<![\p{L}])\p{L}*o\/a(?![\p{L}])/iu, //   o/a, stato/a
    /(?<![\p{L}])\p{L}*a\/o(?![\p{L}])/iu, //   a/o, stata/o
    word('lui\\s*\\/\\s*lei'),
    word('lei\\s*\\/\\s*lui'),
    word('lui o lei'),
    word('lei o lui'),
    word('il\\s*\\/\\s*la'),
  ],
  frStopwords: [
    word('est-ce'),
    word('vous deux'),
    word('quand tu'),
    /(?:^|\s)tu as(?:\s|$)/i,
    word("c'était"),
    word('qui de vous'),
    word('quoi'),
    word('avec'),
    word('dans'),
    word('pour'),
    word('vous'),
  ],
};

const CLASSIC_KEYS = ['difficulty', 'id', 'name', 'theme', 'type', 'you'];
const CHOICE_KEYS = ['difficulty', 'id', 'options', 'question', 'theme', 'type'];
const SLOT = '{name}';
const slotCount = (text: string) => text.split(SLOT).length - 1;
const otherSlot = /\{(?!name\})[^}]*\}/;
const CURLY_SINGLE = /[‘’ʼ]/;
const CURLY_DOUBLE = /[“”]/;

/** True when every « is closed by a later » with no nesting and no stray ». */
export const guillemetsBalanced = (text: string): boolean => {
  let open = false;
  for (const ch of text) {
    if (ch === '«') {
      if (open) return false;
      open = true;
    } else if (ch === '»') {
      if (!open) return false;
      open = false;
    }
  }
  return !open;
};

type TField = { field: string; text: string };
const fieldsOf = (q: TQuestion): TField[] =>
  q.type === 'choice'
    ? [{ field: 'question', text: q.question }, ...q.options.map((text, i) => ({ field: `options[${i}]`, text }))]
    : [{ field: 'you', text: q.you }, { field: 'name', text: q.name }];

const asId = (raw: unknown): number | null =>
  typeof raw === 'object' && raw !== null && typeof (raw as { id?: unknown }).id === 'number' ? (raw as { id: number }).id : null;

function rowProblems(q: TQuestion, ref: TQuestion | undefined, rules: TBankRules): TBankProblem[] {
  const out: TBankProblem[] = [];
  const add = (rule: TBankRule, message: string) => out.push({ id: q.id, rule, message });

  if (ref) {
    if (q.theme !== ref.theme) add('theme', `theme ${q.theme} differs from FR ${ref.theme}`);
    if (q.difficulty !== ref.difficulty) add('difficulty', `difficulty ${q.difficulty} differs from FR ${ref.difficulty}`);
    if (q.type !== ref.type) add('type', `type ${q.type} differs from FR ${ref.type}`);
    if (q.type === 'choice' && ref.type === 'choice' && q.options.length !== ref.options.length) {
      add('options', `${q.options.length} options, FR has ${ref.options.length}`);
    }
  }

  // `{name}` contract
  if (q.type === 'choice') {
    for (const { field, text } of fieldsOf(q)) if (text.includes(SLOT)) add('name-slot', `${SLOT} in choice ${field}`);
  } else {
    if (q.you.includes(SLOT)) add('name-slot', `${SLOT} in you`);
    if (q.type === 'who_of_two') {
      if (q.name !== q.you) add('name-slot', 'who_of_two: name must equal you');
    } else if (slotCount(q.name) !== 1) {
      add('name-slot', `name needs exactly one ${SLOT}, has ${slotCount(q.name)}`);
    }
  }

  const frTexts = ref ? new Map(fieldsOf(ref).map(({ field, text }) => [field, text])) : new Map<string, string>();
  for (const { field, text } of fieldsOf(q)) {
    const classic = q.type !== 'choice';
    const bad = (rule: TBankRule, what: string) => add(rule, `${field}: ${what}`);

    if (otherSlot.test(text)) bad('name-slot', `unknown {slot} in "${text}"`);

    if (classic) {
      if (text.length < rules.classic.min || text.length > rules.classic.max) bad('length', `${text.length} characters, allowed ${rules.classic.min}-${rules.classic.max}`);
      if (!text.endsWith('?')) bad('format', 'does not end with ?');
      if (/ \?/.test(text)) bad('format', 'space before ?');
    } else if (field === 'question') {
      if (text.length > rules.choiceQuestionMax) bad('length', `${text.length} characters, at most ${rules.choiceQuestionMax}`);
    } else if (text.length > rules.choiceOptionMax) {
      bad('length', `${text.length} characters, at most ${rules.choiceOptionMax}`);
    }

    if (/ {2}/.test(text)) bad('format', 'double space');
    if (text !== text.trim()) bad('format', 'leading or trailing space');
    if (/[\t\r\n]/.test(text)) bad('format', 'tab or line break');
    if (CURLY_SINGLE.test(text)) bad('format', 'curly apostrophe (use the straight \')');
    if (text.includes('"')) bad('format', 'straight double quote');
    if (CURLY_DOUBLE.test(text)) bad('format', 'curly double quote “ ” (use « » or none)');
    if (!guillemetsBalanced(text)) bad('format', 'unbalanced « » (every « needs a » after it, no nesting)');
    if (text.includes('@')) bad('at-sign', '@ in text');

    const mark = rules.genderMarks.find((re) => re.test(text));
    if (mark) bad('gender', `gender mark (${mark}) in "${text}"`);
    const french = rules.frStopwords.find((re) => re.test(text));
    if (french) bad('fr-leftover', `French word (${french}) in "${text}"`);
    if (frTexts.get(field) === text) bad('fr-leftover', 'identical to the FR text');
  }
  return out;
}

export function validateTranslatedBank(target: readonly unknown[], fr: readonly TQuestion[], rules: TBankRules): TBankProblem[] {
  const out: TBankProblem[] = [];
  if (!Array.isArray(target)) return [{ id: null, rule: 'schema', message: 'the bank is not an array' }];

  const frById = new Map(fr.map((q) => [q.id, q]));
  const rows: TQuestion[] = [];
  for (const raw of target) {
    const parsed = ZQuestionSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      out.push({ id: asId(raw), rule: 'schema', message: `${issue?.path.join('.') || 'row'}: ${issue?.message ?? 'invalid'}` });
      continue;
    }
    const allowed = parsed.data.type === 'choice' ? CHOICE_KEYS : CLASSIC_KEYS;
    const extra = Object.keys(raw as object).filter((key) => !allowed.includes(key));
    if (extra.length > 0) {
      out.push({ id: parsed.data.id, rule: 'schema', message: `unexpected key(s): ${extra.join(', ')}` });
      continue;
    }
    rows.push(parsed.data);
  }

  // rows: ids and order (over every row that was an object with an id)
  const ids = target.map(asId).filter((id): id is number => id !== null);
  const seen = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) out.push({ id, rule: 'ids', message: 'id appears twice' });
    seen.add(id);
    if (!frById.has(id)) out.push({ id, rule: 'ids', message: 'id is not in FR' });
  }
  for (const { id } of fr) if (!seen.has(id)) out.push({ id, rule: 'ids', message: 'id is missing (it is in FR)' });
  const clean = out.every((p) => p.rule !== 'ids') && ids.length === fr.length;
  if (clean && ids.some((id, i) => id !== fr[i]!.id)) out.push({ id: null, rule: 'order', message: 'ids are not in FR order' });

  for (const q of rows) out.push(...rowProblems(q, frById.get(q.id), rules));

  // duplicates (a pair that FR duplicates itself is tolerated)
  const key = (q: TQuestion) => (q.type === 'choice' ? q.question : q.you).trim().toLowerCase();
  const groups = new Map<string, TQuestion[]>();
  for (const q of rows) groups.set(key(q), [...(groups.get(key(q)) ?? []), q]);
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const refs = group.map((q) => frById.get(q.id));
    const frAlsoDuplicates = refs.every((r) => r !== undefined) && new Set(refs.map((r) => key(r!))).size === 1;
    if (frAlsoDuplicates) continue;
    for (const q of group.slice(1)) out.push({ id: q.id, rule: 'duplicate', message: `same text as #${group[0]!.id}` });
  }
  return out;
}

/**
 * Non-failing review aid: ids whose text holds an essere participle or other form that agrees in gender with the player
 * ("sei stato", "è andata", "cresciuto"). The lavagna asks for a human look, not a failure: such a row may be fine ("è stato un anno
 * difficile" says nothing about the player). Returns the ids, ascending and unique.
 */
const PARTICIPLE_STEMS = 'andat|cresciut|nat|venut|rimast|diventat|uscit|arrivat|partit|tornat|cadut|salit|scappat|entrat|restat';
const ESSERE = '(?:è|sei|era|eri|ero|sono|siamo|siete|fosse|fossi|sia)';
export const PARTICIPLE_PATTERNS: readonly RegExp[] = [
  new RegExp(`(?<![\\p{L}])${ESSERE}\\s+(?:(?:mai|già|ancora|sempre)\\s+)?stat[oaie](?![\\p{L}])`, 'iu'),
  new RegExp(`(?<![\\p{L}])(?:${PARTICIPLE_STEMS})[oaie](?![\\p{L}])`, 'iu'),
];

export function flagParticiples(target: readonly unknown[]): number[] {
  const flagged = new Set<number>();
  for (const raw of target) {
    if (typeof raw !== 'object' || raw === null) continue;
    const row = raw as { id?: unknown; you?: unknown; name?: unknown; question?: unknown; options?: unknown };
    if (typeof row.id !== 'number') continue;
    const texts = [row.you, row.name, row.question, ...(Array.isArray(row.options) ? row.options : [])].filter((t): t is string => typeof t === 'string');
    if (texts.some((text) => PARTICIPLE_PATTERNS.some((re) => re.test(text)))) flagged.add(row.id);
  }
  return [...flagged].sort((a, b) => a - b);
}
