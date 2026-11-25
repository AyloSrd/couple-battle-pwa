import { describe, expect, it } from 'vitest';
import { fr } from './strings.fr';
import { en } from './strings.en';
import { es } from './strings.es';
import { it as italian } from './strings.it';

/**
 * "How to play": the four principle cards, the seating diagram and the modes heading (13 keys, the same text as the iPhone app).
 * The 13 texts are pinned verbatim in four languages, then the wording and hygiene rules run over EVERY `howto.*` string.
 */

const dicts = { fr, en, es, it: italian } as unknown as Record<'fr' | 'en' | 'es' | 'it', Record<string, string>>;
const codes = ['fr', 'en', 'es', 'it'] as const;

const NEW_KEYS = [
  'howto.principles.phone.title',
  'howto.principles.phone.body',
  'howto.principles.split.title',
  'howto.principles.split.body',
  'howto.principles.split.alt',
  'howto.principles.roles.title',
  'howto.principles.roles.body',
  'howto.principles.win.title',
  'howto.principles.win.body',
  'howto.side.a',
  'howto.side.b',
  'howto.couple',
  'howto.modes.title',
] as const;

const EXPECTED: Record<(typeof codes)[number], Record<(typeof NEW_KEYS)[number], string>> = {
  fr: {
    'howto.principles.phone.title': 'Un seul téléphone',
    'howto.principles.phone.body': "Il passe de main en main. Pas besoin d'en avoir un chacun.",
    'howto.principles.split.title': 'Chaque couple se sépare',
    'howto.principles.split.body': "Dans chaque couple, l'un s'installe d'un côté, l'autre en face.",
    'howto.principles.split.alt': 'Deux couples : dans chacun, une personne de chaque côté.',
    'howto.principles.roles.title': "Un côté répond, l'autre devine",
    'howto.principles.roles.body': 'La réponse reste secrète. Ensuite, on échange les rôles.',
    'howto.principles.win.title': 'Le duo le plus synchro gagne',
    'howto.principles.win.body': 'Quand vos réponses se rejoignent, vous marquez des points.',
    'howto.side.a': 'Côté A',
    'howto.side.b': 'Côté B',
    'howto.couple': 'Couple {n}',
    'howto.modes.title': 'Les 3 modes',
  },
  en: {
    'howto.principles.phone.title': 'One phone for everyone',
    'howto.principles.phone.body': 'It goes from hand to hand. No need for one each.',
    'howto.principles.split.title': 'Each couple splits up',
    'howto.principles.split.body': 'In each couple, one sits on one side, the other across.',
    'howto.principles.split.alt': 'Two couples: in each, one person on each side.',
    'howto.principles.roles.title': 'One side answers, the other guesses',
    'howto.principles.roles.body': 'The answer stays secret. Then you swap roles.',
    'howto.principles.win.title': 'The most in-sync duo wins',
    'howto.principles.win.body': 'When your answers match, you score points.',
    'howto.side.a': 'Side A',
    'howto.side.b': 'Side B',
    'howto.couple': 'Couple {n}',
    'howto.modes.title': 'The 3 modes',
  },
  es: {
    'howto.principles.phone.title': 'Un solo teléfono',
    'howto.principles.phone.body': 'Pasa de mano en mano. No hace falta uno por persona.',
    'howto.principles.split.title': 'Cada pareja se separa',
    'howto.principles.split.body': 'En cada pareja, una persona se sienta a un lado y la otra enfrente.',
    'howto.principles.split.alt': 'Dos parejas: en cada una, una persona a cada lado.',
    'howto.principles.roles.title': 'Un lado responde, el otro adivina',
    'howto.principles.roles.body': 'La respuesta queda en secreto. Luego se cambian los roles.',
    'howto.principles.win.title': 'Gana el dúo más sincronizado',
    'howto.principles.win.body': 'Cuando las respuestas coinciden, se suman puntos.',
    'howto.side.a': 'Lado A',
    'howto.side.b': 'Lado B',
    'howto.couple': 'Pareja {n}',
    'howto.modes.title': 'Los 3 modos',
  },
  it: {
    'howto.principles.phone.title': 'Un solo telefono',
    'howto.principles.phone.body': 'Passa di mano in mano. Non ne serve uno a testa.',
    'howto.principles.split.title': 'Ogni coppia si divide',
    'howto.principles.split.body': "In ogni coppia, una persona si siede da un lato e l'altra di fronte.",
    'howto.principles.split.alt': 'Due coppie: in ognuna, una persona per lato.',
    'howto.principles.roles.title': "Un lato risponde, l'altro indovina",
    'howto.principles.roles.body': 'La risposta resta segreta. Poi si cambiano i ruoli.',
    'howto.principles.win.title': 'Vince il duo più in sintonia',
    'howto.principles.win.body': 'Quando le risposte coincidono, fate punti.',
    'howto.side.a': 'Lato A',
    'howto.side.b': 'Lato B',
    'howto.couple': 'Coppia {n}',
    'howto.modes.title': 'Le 3 modalità',
  },
};

const howtoEntries = (code: (typeof codes)[number]) => Object.entries(dicts[code]).filter(([key]) => key.startsWith('howto.'));

/** Whole word, any letter (accents included) counts as part of a word. */
const word = (w: string) => new RegExp(`(?<![\\p{L}])${w}(?![\\p{L}])`, 'iu');

const FORBIDDEN: Record<string, string[]> = {
  gender: ['garçons', 'filles', 'boys', 'girls', 'chicos', 'chicas', 'ragazzi', 'ragazze'],
  half: ['moitié', 'half', 'mitad', 'metà'],
  versus: ['contre', 'against', 'versus', 'contra', 'contro'],
  otherGames: ['undercover', 'monopoly', 'taboo', 'tabou', 'pictionary', 'scrabble', 'cluedo', 'cranium', 'trivial pursuit', "time's up", 'cards against humanity'],
};

describe('howto strings: the 13 new keys', () => {
  it.each(codes)('%s: exact text', (code) => {
    for (const key of NEW_KEYS) expect(dicts[code][key], `${code} ${key}`).toBe(EXPECTED[code][key]);
  });

  it('the same 13 keys exist in all four dictionaries', () => {
    for (const code of codes) {
      const present = NEW_KEYS.filter((key) => key in dicts[code]);
      expect(present, code).toEqual([...NEW_KEYS]);
    }
  });

  it.each(codes)('%s: howto.couple has exactly one {n}, and no howto.* string has another placeholder', (code) => {
    expect(dicts[code]['howto.couple']!.match(/\{n\}/g)).toHaveLength(1);
    for (const [key, value] of howtoEntries(code)) {
      const slots = value.match(/\{[^}]*\}/g) ?? [];
      expect(slots, `${code} ${key}`).toEqual(key === 'howto.couple' ? ['{n}'] : []);
    }
  });

  it('the old howto.* keys are all still there (nothing renamed or removed)', () => {
    for (const code of codes) {
      for (const key of ['howto.title', 'howto.swipe', 'howto.flash.name', 'howto.dilemma.name', 'howto.ultime.name', 'howto.flash.body', 'howto.dilemma.body', 'howto.ultime.body']) {
        expect(dicts[code][key], `${code} ${key}`).toBeTruthy();
      }
    }
  });
});

describe('howto strings: wording rules (whole words, every howto.* string)', () => {
  it('the matcher is whole-word and accent-aware', () => {
    expect(word('contre').test('Un jeu contre le temps')).toBe(true);
    expect(word('contro').test('il contrario')).toBe(false);
    expect(word('metà').test('la metà')).toBe(true);
    expect(word('uno').test('Qualcuno')).toBe(false);
    expect(word('moitié').test('La moitié.')).toBe(true);
    expect(word('half').test('Chalfont')).toBe(false);
  });

  for (const [rule, list] of Object.entries(FORBIDDEN)) {
    it.each(codes)(`${rule}: no forbidden word in %s`, (code) => {
      const hits: string[] = [];
      for (const [key, value] of howtoEntries(code)) {
        for (const w of list) if (word(w).test(value)) hits.push(`${key}: ${w}`);
      }
      expect(hits).toEqual([]);
    });
  }
});

describe('howto strings: hygiene (every howto.* string)', () => {
  /** A character class from code point ranges: the source holds no control or invisible character itself. */
  const charClass = (ranges: [number, number][]) => new RegExp('[' + ranges.map(([from, to]) => String.fromCodePoint(from) + '-' + String.fromCodePoint(to)).join('') + ']', 'u');
  const CONTROL = charClass([[0x0000, 0x001f], [0x007f, 0x009f]]);
  const INVISIBLE = charClass([[0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff], [0x00ad, 0x00ad]]);

  it.each(codes)('%s: no URL, no "@", no control / zero-width / bidi character, no stray spaces', (code) => {
    for (const [key, value] of howtoEntries(code)) {
      expect(value, `${code} ${key}`).not.toMatch(/http/i);
      expect(value, `${code} ${key}`).not.toContain('@');
      expect(value, `${code} ${key}`).not.toMatch(CONTROL);
      expect(value, `${code} ${key}`).not.toMatch(INVISIBLE);
      expect(value, `${code} ${key}`).toBe(value.trim());
      expect(value, `${code} ${key}`).not.toMatch(/ {2}/);
    }
  });

  it('fr: plain spaces before "?", "!" and ":" (no no-break space)', () => {
    for (const [key, value] of howtoEntries('fr')) {
      expect(value, key).not.toMatch(new RegExp('[' + [0x00a0, 0x202f, 0x2009].map((code) => String.fromCodePoint(code)).join('') + ']', 'u'));
    }
  });
});
