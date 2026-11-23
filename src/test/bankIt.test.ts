import { describe, expect, it } from 'vitest';
import type { TQuestion } from '@/shared/questions/domain/types';
import { flagParticiples, IT_RULES, validateTranslatedBank, type TBankRule } from './bankIt';

/** The validator, rule by rule: one passing case (the good bank) and one failing case per rule, on a small French fixture. */

const FR: TQuestion[] = [
  { id: 1, theme: 'childhood', difficulty: 'easy', type: 'open', you: "C'était quoi ton dessin animé préféré ?", name: "C'était quoi le dessin animé préféré de {name} ?" },
  { id: 2, theme: 'childhood', difficulty: 'easy', type: 'who_of_two', you: 'Qui de vous deux était le plus gourmand ?', name: 'Qui de vous deux était le plus gourmand ?' },
  { id: 3, theme: 'travel', difficulty: 'medium', type: 'yes_no', you: 'Tu as déjà raté un avion ?', name: 'Est-ce que {name} a déjà raté un avion ?' },
  { id: 4, theme: 'travel', difficulty: 'medium', type: 'this_or_that', you: 'Mer ou montagne ?', name: 'Mer ou montagne pour {name} ?' },
  {
    id: 5,
    theme: 'homeDaily',
    difficulty: 'hard',
    type: 'choice',
    question: 'La porte claque, clés à l’intérieur. Premier réflexe ?',
    options: ['Je fouille mes poches.', 'J’appelle le serrurier.', 'Je sonne chez les voisins.'],
  },
];

const IT: TQuestion[] = [
  { id: 1, theme: 'childhood', difficulty: 'easy', type: 'open', you: "Qual era il tuo cartone animato preferito da bambino?", name: "Qual era il cartone animato preferito di {name} da bambino?" },
  { id: 2, theme: 'childhood', difficulty: 'easy', type: 'who_of_two', you: 'Chi di voi due mangiava di più da piccolo?', name: 'Chi di voi due mangiava di più da piccolo?' },
  { id: 3, theme: 'travel', difficulty: 'medium', type: 'yes_no', you: 'Hai mai perso un aereo?', name: 'Ha mai perso un aereo {name}?' },
  { id: 4, theme: 'travel', difficulty: 'medium', type: 'this_or_that', you: 'Mare o montagna?', name: 'Mare o montagna per {name}?' },
  {
    id: 5,
    theme: 'homeDaily',
    difficulty: 'hard',
    type: 'choice',
    question: "La porta si chiude con le chiavi dentro. Che cosa fai per prima cosa?",
    options: ['Frugo nelle tasche.', "Chiamo il fabbro.", "Suono ai vicini."],
  },
];

type TRow = Record<string, unknown>;
const clone = (rows: TQuestion[]): TRow[] => JSON.parse(JSON.stringify(rows)) as TRow[];
const rulesOf = (target: readonly unknown[], fr: TQuestion[] = FR) => [...new Set(validateTranslatedBank(target, fr, IT_RULES).map((p) => p.rule))].sort();
/** The rules broken after `edit` changed row `id` of an otherwise good bank. */
const breaks = (id: number, edit: (row: TRow) => void): TBankRule[] => {
  const rows = clone(IT);
  edit(rows.find((r) => r.id === id)!);
  return rulesOf(rows) as TBankRule[];
};

describe('validateTranslatedBank: a good bank', () => {
  it('has no problem', () => {
    expect(validateTranslatedBank(IT, FR, IT_RULES)).toEqual([]);
  });

  it('may use a plain apostrophe, a question mark glued to the last word, and a straight apostrophe in a choice', () => {
    const rows = clone(IT);
    rows[0]!.you = "Qual era l'ultimo cartone animato che guardavi?";
    expect(rulesOf(rows)).toEqual([]);
  });

  it('allows balanced « » in a classic row and in a choice row', () => {
    expect(breaks(5, (r) => ((r.options as string[])[2] = 'Suono ai vicini: «buongiorno».'))).toEqual([]);
    expect(breaks(1, (r) => (r.you = 'Qual era il tuo «cartone» preferito da bambino?'))).toEqual([]);
    expect(breaks(1, (r) => (r.you = 'Chi dice «torna» e poi «resta» dopo questo drink?'))).toEqual([]);
  });

  it('rejects unbalanced, nested or reversed « » and curly double quotes', () => {
    expect(breaks(1, (r) => (r.you = 'Qual era il tuo «cartone preferito da bambino?'))).toEqual(['format']);
    expect(breaks(1, (r) => (r.you = 'Qual era il tuo cartone» preferito da bambino?'))).toEqual(['format']);
    expect(breaks(1, (r) => (r.you = 'Qual era il tuo «car«to»ne» preferito da bambino?'))).toEqual(['format']);
    expect(breaks(1, (r) => (r.you = 'Qual era il tuo »cartone« preferito da bambino?'))).toEqual(['format']);
    expect(breaks(5, (r) => ((r.options as string[])[2] = 'Suono ai vicini: «buongiorno.'))).toEqual(['format']);
    expect(breaks(1, (r) => (r.you = 'Qual era il tuo “cartone” preferito da bambino?'))).toEqual(['format']);
  });
});

describe('validateTranslatedBank: schema', () => {
  it('rejects a row ZQuestionSchema rejects (missing field, bad theme, wrong type of value)', () => {
    expect(breaks(1, (r) => delete r.name)).toContain('schema');
    expect(breaks(1, (r) => (r.theme = 'nope'))).toContain('schema');
    expect(breaks(1, (r) => (r.you = 12))).toContain('schema');
  });

  it('rejects a choice row with two options and a stray key', () => {
    expect(breaks(5, (r) => ((r.options as string[]).pop()))).toContain('schema');
    expect(breaks(1, (r) => (r.note = 'x'))).toEqual(['schema']);
  });

  it('rejects a bank that is not an array', () => {
    expect(rulesOf({} as unknown as unknown[])).toEqual(['schema']);
  });
});

describe('validateTranslatedBank: rows against FR', () => {
  it('reports a missing id, an extra id and a duplicate id, each with its id', () => {
    const missing = validateTranslatedBank(clone(IT).slice(0, 4), FR, IT_RULES);
    expect(missing).toEqual([expect.objectContaining({ id: 5, rule: 'ids' })]);
    const extra = clone(IT);
    extra.push({ ...extra[0]!, id: 99 });
    expect(validateTranslatedBank(extra, FR, IT_RULES)).toContainEqual(expect.objectContaining({ id: 99, rule: 'ids' }));
    const twice = clone(IT);
    twice.push({ ...twice[3]!, you: 'Dolce o salato?', name: 'Dolce o salato per {name}?' });
    expect(validateTranslatedBank(twice, FR, IT_RULES)).toContainEqual(expect.objectContaining({ id: 4, rule: 'ids', message: 'id appears twice' }));
  });

  it('reports a different order (and only that)', () => {
    const rows = clone(IT);
    [rows[0], rows[1]] = [rows[1]!, rows[0]!];
    expect(rulesOf(rows)).toEqual(['order']);
  });

  it('reports a different theme, difficulty or type, each on its own', () => {
    expect(breaks(1, (r) => (r.theme = 'travel'))).toEqual(['theme']);
    expect(breaks(1, (r) => (r.difficulty = 'hard'))).toEqual(['difficulty']);
    expect(breaks(3, (r) => (r.type = 'open'))).toEqual(['type']);
  });

  it('reports a classic row that became a choice row (type and schema both)', () => {
    const rows = clone(IT);
    rows[3] = { id: 4, theme: 'travel', difficulty: 'medium', type: 'choice', question: 'Mare o montagna?', options: ['a', 'b', 'c'] };
    expect(rulesOf(rows)).toContain('type');
  });
});

describe('validateTranslatedBank: the {name} contract', () => {
  it('rejects {name} in a classic `you`', () => {
    expect(breaks(1, (r) => (r.you = 'Qual era il cartone preferito di {name}?'))).toEqual(['name-slot']);
  });

  it('who_of_two: name must equal you', () => {
    expect(breaks(2, (r) => (r.name = 'Chi di voi due mangiava di più?'))).toEqual(['name-slot']);
    expect(breaks(2, (r) => (r.you = r.name = 'Chi di voi due ama di più {name}?'))).toEqual(['name-slot']);
  });

  it('other classic types: `name` has exactly one {name}', () => {
    expect(breaks(1, (r) => (r.name = 'Qual era il cartone animato preferito da bambino?'))).toEqual(['name-slot']);
    expect(breaks(4, (r) => (r.name = '{name} sceglie mare o {name}?'))).toEqual(['name-slot']);
  });

  it('rejects any other {slot}', () => {
    expect(breaks(1, (r) => (r.name = 'Qual era il cartone di {name} e {nome}?'))).toContain('name-slot');
  });

  it('choice: no {name} in the question or in an option', () => {
    expect(breaks(5, (r) => (r.question = 'Che cosa fa {name} per prima cosa con le chiavi dentro?'))).toEqual(['name-slot']);
    expect(breaks(5, (r) => ((r.options as string[])[1] = 'Chiamo {name}.'))).toEqual(['name-slot']);
  });
});

describe('validateTranslatedBank: lengths', () => {
  it('classic `you` and `name` are 8 to 140 characters', () => {
    expect(breaks(4, (r) => (r.you = 'Mare?'))).toEqual(['length']);
    expect(breaks(4, (r) => (r.you = `${'a'.repeat(140)}?`))).toEqual(['length']);
    expect(breaks(4, (r) => (r.you = `${'a'.repeat(139)}?`))).toEqual([]);
    expect(breaks(4, (r) => (r.you = 'Mare c?'))).toEqual(['length']);
    expect(breaks(4, (r) => (r.you = 'Mare co?'))).toEqual([]);
  });

  it('choice question <= 140 and options <= 100', () => {
    expect(breaks(5, (r) => (r.question = `${'a'.repeat(141)}`))).toEqual(['length']);
    expect(breaks(5, (r) => (r.question = `${'a'.repeat(140)}`))).toEqual([]);
    expect(breaks(5, (r) => ((r.options as string[])[0] = 'a'.repeat(101)))).toEqual(['length']);
    expect(breaks(5, (r) => ((r.options as string[])[0] = 'a'.repeat(100)))).toEqual([]);
  });
});

describe('validateTranslatedBank: format', () => {
  it('classic fields end with ?', () => {
    expect(breaks(4, (r) => (r.you = 'Mare o montagna.'))).toEqual(['format']);
    expect(breaks(4, (r) => (r.name = 'Mare o montagna per {name}'))).toEqual(['format']);
  });

  it('a choice question does not need a ?', () => {
    expect(breaks(5, (r) => (r.question = 'La porta si chiude con le chiavi dentro. Che fai ora'))).toEqual([]);
  });

  it('rejects a space before ?', () => {
    expect(breaks(4, (r) => (r.you = 'Mare o montagna ?'))).toEqual(['format']);
  });

  it('rejects double, leading and trailing spaces (classic and choice)', () => {
    expect(breaks(4, (r) => (r.you = 'Mare  o montagna?'))).toEqual(['format']);
    expect(breaks(4, (r) => (r.you = ' Mare o montagna?'))).toEqual(['format']);
    expect(breaks(4, (r) => (r.name = 'Mare o montagna per {name}? '))).toContain('format');
    expect(breaks(5, (r) => ((r.options as string[])[2] = 'Suono  ai vicini.'))).toEqual(['format']);
    expect(breaks(5, (r) => ((r.options as string[])[2] = 'Suono ai vicini. '))).toEqual(['format']);
  });

  it('rejects a curly apostrophe, in classic and in choice rows', () => {
    expect(breaks(1, (r) => (r.you = 'Qual era l’ultimo cartone che guardavi?'))).toEqual(['format']);
    expect(breaks(5, (r) => ((r.options as string[])[1] = 'Chiamo l’idraulico.'))).toEqual(['format']);
  });

  it('rejects a straight double quote', () => {
    expect(breaks(1, (r) => (r.you = 'Qual era il "cartone" preferito da bambino?'))).toEqual(['format']);
    expect(breaks(5, (r) => ((r.options as string[])[1] = 'Dico "ciao" al fabbro.'))).toEqual(['format']);
  });
});

describe('validateTranslatedBank: gender marks', () => {
  it.each([
    'Sei mai stato(a) in aereo?',
    'Sei mai stato/a in aereo?',
    'Sei mai stata/o in aereo?',
    'Chi è il più viziato/a da bambino?',
    'Hai mai perso un aereo (a) causa di lui/lei?',
    'Hai mai perso un aereo per colpa di lui o lei?',
    'Hai mai perso un aereo per colpa di lei/lui?',
    'Sei mai cresciuto in una città (e) piccola?',
    'Hai mai perso il/la valigia?',
  ])('rejects a classic text with a mark: %s', (text) => {
    expect(breaks(3, (r) => (r.you = text))).toEqual(['gender']);
  });

  it('rejects a mark in `name` and in a choice option', () => {
    expect(breaks(3, (r) => (r.name = 'Ha mai perso {name} un aereo, stato/a?'))).toEqual(['gender']);
    expect(breaks(5, (r) => ((r.options as string[])[0] = 'Sono stato/a zitto/a.'))).toEqual(['gender']);
  });

  it('does not take ordinary slashes and words for a mark', () => {
    expect(breaks(3, (r) => (r.you = 'Hai mai perso un aereo o un treno?'))).toEqual([]);
    expect(breaks(3, (r) => (r.you = 'Hai mai perso il volo Roma/Oslo?'))).toEqual([]);
    expect(breaks(3, (r) => (r.you = 'Hai mai perso un volo, a ottobre?'))).toEqual([]);
  });
});

describe('validateTranslatedBank: French leftovers', () => {
  it('rejects a value equal to its FR counterpart (classic and choice)', () => {
    expect(breaks(4, (r) => (r.you = 'Mer ou montagne ?'))).toContain('fr-leftover');
    const sameChoice = clone(IT);
    (sameChoice[4]!.options as string[])[0] = 'Je fouille mes poches.';
    expect(rulesOf(sameChoice)).toContain('fr-leftover');
  });

  it('rejects a value equal to FR even when it would otherwise pass (a cognate)', () => {
    const fr: TQuestion[] = [...FR.slice(0, 3), { ...FR[3]!, you: 'Mare o montagna?', name: 'Mare o montagna per {name}?' } as TQuestion, FR[4]!];
    expect(rulesOf(clone(IT), fr)).toEqual(['fr-leftover']);
  });

  it.each(['Est-ce que hai perso un aereo?', 'Hai perso un aereo con vous deux?', 'Hai perso un aereo quand tu eri a casa?', 'Hai mai perso un aereo, tu as capito?', 'Chi di voi due ha perso un aereo quoi?'])(
    'rejects French words: %s',
    (text) => {
      expect(breaks(3, (r) => (r.you = text))).toEqual(['fr-leftover']);
    },
  );

  it('does not take Italian words for French ones', () => {
    expect(breaks(3, (r) => (r.you = 'Hai mai perso un aereo quando eri piccolo?'))).toEqual([]);
    expect(breaks(3, (r) => (r.you = 'Hai mai perso un aereo e hai assunto un tuo amico?'))).toEqual([]);
  });
});

describe('validateTranslatedBank: duplicates and @', () => {
  it('rejects two classic rows with the same `you` (case and edge spaces aside), naming the second', () => {
    const problems = (() => {
      const rows = clone(IT);
      rows[3]!.you = 'hai mai perso un aereo?';
      return validateTranslatedBank(rows, FR, IT_RULES).filter((p) => p.rule === 'duplicate');
    })();
    expect(problems).toEqual([expect.objectContaining({ id: 4 })]);
  });

  it('accepts a duplicate that FR itself has (same `you` on both FR rows)', () => {
    const fr: TQuestion[] = [...FR.slice(0, 3), { ...FR[3]!, you: 'Tu as déjà raté un avion ?' } as TQuestion, FR[4]!];
    const rows = clone(IT);
    rows[3]!.you = rows[2]!.you;
    expect(rulesOf(rows, fr)).toEqual([]);
  });

  it('rejects two choice rows with the same question', () => {
    const fr: TQuestion[] = [...FR, { ...(FR[4] as Extract<TQuestion, { type: 'choice' }>), id: 6, question: 'Autre question ?' }];
    const rows = [...clone(IT), { ...clone(IT)[4]!, id: 6 }];
    expect(validateTranslatedBank(rows, fr, IT_RULES)).toContainEqual(expect.objectContaining({ id: 6, rule: 'duplicate' }));
  });

  it('rejects an @ anywhere', () => {
    expect(breaks(4, (r) => (r.name = 'Mare o montagna per {name} @casa?'))).toEqual(['at-sign']);
    expect(breaks(5, (r) => ((r.options as string[])[0] = `Scrivo a mario${'@'}esempio.it.`))).toEqual(['at-sign']);
  });
});

describe('validateTranslatedBank: problems carry the id', () => {
  it('names the row and the field', () => {
    const rows = clone(IT);
    rows[3]!.you = 'Mare.';
    const problems = validateTranslatedBank(rows, FR, IT_RULES);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.id === 4)).toBe(true);
    expect(problems.map((p) => p.message).join('\n')).toContain('you:');
  });
});

describe('flagParticiples (review aid, never a failure)', () => {
  const rowsOf = (texts: string[]) => texts.map((you, i) => ({ id: i + 1, type: 'open', you, name: `${you} {name}` }));

  it('flags essere participles and agreeing forms, by id, ascending and once', () => {
    const rows = rowsOf([
      'Sei mai stato in Giappone?',
      'Hai mai perso un aereo?',
      'Dove sei andato in vacanza?',
      'Sei cresciuto in una città piccola?',
      'Era stata una buona idea?',
      'Dove sei nata?',
      'Hai passato l’infanzia in una città piccola?',
    ]);
    expect(flagParticiples(rows)).toEqual([1, 3, 4, 5, 6]);
  });

  it('looks at `name`, at a choice question and at the options', () => {
    expect(flagParticiples([{ id: 7, you: 'Hai mai perso un aereo?', name: 'Quando è andata via {name}?' }])).toEqual([7]);
    expect(flagParticiples([{ id: 8, type: 'choice', question: 'Che fai?', options: ['Resto', 'Sono rimasta zitta', 'Esco'] }])).toEqual([8]);
  });

  it('flags the "è stato" of a sentence about a thing too (the human decides)', () => {
    expect(flagParticiples([{ id: 9, you: 'Qual è stato il tuo regalo migliore?', name: 'Qual è stato il regalo di {name}?' }])).toEqual([9]);
  });

  it('ignores rows without a numeric id or without text, and never throws', () => {
    expect(flagParticiples([null, 3, { you: 'Sei stato?' }, { id: 4 }])).toEqual([]);
  });

  it('is not a validator: a bank full of participles still validates', () => {
    const rows = clone(IT);
    rows[2]!.you = 'Sei mai stato in ritardo a un volo?';
    expect(rulesOf(rows)).toEqual([]);
    expect(flagParticiples(rows)).toEqual([3]);
  });
});
