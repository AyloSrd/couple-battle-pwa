import { describe, expect, it } from 'vitest';
import { Mode } from '@/shared/game/domain/types';
import type { TThemeId } from '@/shared/game/domain/types';
import { CHOICE_PER_FLASH_BLOCK, deckSizeFor, drawDeck, drawFlashBlock, filterQuestions, modeQuestionTypes } from './services';
import type { TQuestion, TQuestionDifficulty, TQuestionType } from './types';

/** The deck rule of `choice` (P14): exactly one choice card per block of four Flash cards, never in Dilemma or rapid-fire. */

type TChoice = Extract<TQuestion, { type: 'choice' }>;
const classicRow = (id: number, type: Exclude<TQuestionType, 'choice'>, difficulty: TQuestionDifficulty = 'easy', theme: TThemeId = 'childhood'): TQuestion => ({
  id,
  theme,
  difficulty,
  type,
  you: `q${id}`,
  name: `q${id} de {name}`,
});
const choiceRow = (id: number, difficulty: TQuestionDifficulty = 'easy', theme: TThemeId = 'childhood'): TChoice => ({
  id,
  theme,
  difficulty,
  type: 'choice',
  question: `choice ${id}`,
  options: ['A', 'B', 'C'],
});

const CLASSIC_FLASH = ['open', 'this_or_that', 'yes_no'] as const;
/** Classic ids 1..N (every type), choice ids 1001..: the three difficulties, 8 of each. */
const classics = (n = 60): TQuestion[] => Array.from({ length: n }, (_, i) => classicRow(i + 1, (['open', 'this_or_that', 'yes_no', 'who_of_two'] as const)[i % 4]!, (['easy', 'medium', 'hard'] as const)[i % 3]!));
const choices = (n = 24): TChoice[] => Array.from({ length: n }, (_, i) => choiceRow(1001 + i, (['easy', 'medium', 'hard'] as const)[i % 3]!));
const bank = (): TQuestion[] => [...classics(), ...choices()];

/** A deterministic rng per seed (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const CONSTANT_RNGS = [() => 0, () => 0.5, () => 0.999999];
const isChoice = (q: TQuestion) => q.type === 'choice';
const ids = (deck: TQuestion[]) => deck.map((q) => q.id);

describe('the constants and the type lists', () => {
  it('CHOICE_PER_FLASH_BLOCK is 1', () => {
    expect(CHOICE_PER_FLASH_BLOCK).toBe(1);
  });

  it('Flash keeps its classic types; Dilemma its single one: modeQuestionTypes never lists choice', () => {
    expect(modeQuestionTypes(Mode.Flash).slice().sort()).toEqual(['open', 'this_or_that', 'yes_no']);
    expect(modeQuestionTypes(Mode.Dilemma)).toEqual(['who_of_two']);
    expect(modeQuestionTypes(Mode.Ultime)).not.toContain('choice');
  });

  it('filterQuestions can ask for choice by type, with the same filters as the others', () => {
    const all = bank();
    expect(filterQuestions(all, { types: ['choice'] }).every(isChoice)).toBe(true);
    expect(filterQuestions(all, { types: ['choice'], difficulty: 'hard' }).every((q) => isChoice(q) && q.difficulty === 'hard')).toBe(true);
    expect(filterQuestions(all, { types: ['choice'], excludeIds: [1001] }).map((q) => q.id)).not.toContain(1001);
  });

  it('deck sizes did not change (a choice replaces a card, it does not add one)', () => {
    expect(deckSizeFor('flash', 3)).toBe(4);
    expect(deckSizeFor('ultime', 2)).toBe(19);
  });
});

describe('drawFlashBlock(classicPool, choicePool, count, rng)', () => {
  const classicPool = (n = 10) => classics(n).filter((q) => q.type !== 'who_of_two');
  const choicePool = (n = 5) => choices(n);

  it.each(CONSTANT_RNGS.map((rng, i) => [i, rng] as const))('holds exactly one choice and count-1 classic cards (constant rng #%i)', (_i, rng) => {
    const block = drawFlashBlock(classicPool(), choicePool(), 4, rng);
    expect(block).toHaveLength(4);
    expect(block.filter(isChoice)).toHaveLength(CHOICE_PER_FLASH_BLOCK);
    expect(block.filter((q) => !isChoice(q)).every((q) => CLASSIC_FLASH.includes(q.type as (typeof CLASSIC_FLASH)[number]))).toBe(true);
    expect(new Set(ids(block)).size).toBe(4);
  });

  it('draws only from the pools it is given', () => {
    const classic = classicPool();
    const choice = choicePool();
    const block = drawFlashBlock(classic, choice, 4, seeded(3));
    const allowed = new Set([...ids(classic), ...ids(choice)]);
    expect(ids(block).every((id) => allowed.has(id))).toBe(true);
    expect(block.filter(isChoice).every((q) => ids(choice).includes(q.id))).toBe(true);
  });

  it('with no choice available, all cards are classic and nothing throws', () => {
    for (const rng of CONSTANT_RNGS) {
      const block = drawFlashBlock(classicPool(), [], 4, rng);
      expect(block).toHaveLength(4);
      expect(block.some(isChoice)).toBe(false);
    }
  });

  it('with a single choice in the pool it is the one, whatever the rng', () => {
    const block = drawFlashBlock(classicPool(), [choiceRow(2001)], 4, seeded(9));
    expect(block.filter(isChoice).map((q) => q.id)).toEqual([2001]);
  });

  it('the choice sits at a random position: all four are reached over the seeds', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 300; seed++) positions.add(drawFlashBlock(classicPool(), choicePool(), 4, seeded(seed)).findIndex(isChoice));
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('is deterministic per seed', () => {
    for (const seed of [0, 1, 7, 42]) {
      expect(ids(drawFlashBlock(classicPool(), choicePool(), 4, seeded(seed)))).toEqual(ids(drawFlashBlock(classicPool(), choicePool(), 4, seeded(seed))));
    }
  });

  it('does not change the pools it is given', () => {
    const classic = classicPool();
    const choice = choicePool();
    const before = JSON.stringify([classic, choice]);
    drawFlashBlock(classic, choice, 4, seeded(5));
    expect(JSON.stringify([classic, choice])).toBe(before);
  });

  it('a short classic pool gives fewer cards, never more than count and never a duplicate', () => {
    const block = drawFlashBlock(classicPool(5).slice(0, 1), choicePool(), 4, seeded(2));
    expect(block.length).toBeLessThanOrEqual(4);
    expect(new Set(ids(block)).size).toBe(block.length);
  });
});

describe('drawDeck, Flash: one choice card among the four', () => {
  const flash = (questions: TQuestion[], over: Partial<Parameters<typeof drawDeck>[1]> = {}, rng: () => number = seeded(1)) =>
    drawDeck(questions, { mode: 'flash', difficulty: 'mix', themes: [], seenIds: [], size: deckSizeFor('flash', 1), ...over }, rng);

  it.each(CONSTANT_RNGS.map((rng, i) => [i, rng] as const))('four cards, exactly one choice, the others classic Flash types (constant rng #%i)', (_i, rng) => {
    const deck = flash(bank(), {}, rng);
    expect(deck).toHaveLength(4);
    expect(deck.filter(isChoice)).toHaveLength(1);
    expect(deck.filter((q) => !isChoice(q)).every((q) => (CLASSIC_FLASH as readonly string[]).includes(q.type))).toBe(true);
    expect(new Set(ids(deck)).size).toBe(4);
  });

  it('every one of the four positions is reachable; a seed always draws the same deck', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 300; seed++) positions.add(flash(bank(), {}, seeded(seed)).findIndex(isChoice));
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
    expect(ids(flash(bank(), {}, seeded(11)))).toEqual(ids(flash(bank(), {}, seeded(11))));
  });

  it.each(['easy', 'medium', 'hard'] as const)('%s: the choice card has that difficulty too', (difficulty) => {
    for (let seed = 0; seed < 20; seed++) {
      const deck = flash(bank(), { difficulty }, seeded(seed));
      expect(deck.filter(isChoice)).toHaveLength(1);
      expect(deck.every((q) => q.difficulty === difficulty)).toBe(true);
    }
  });

  it('themes filter the choice card like the classic ones', () => {
    const rows = [...classics().map((q, i) => ({ ...q, theme: (i % 2 ? 'travel' : 'money') as TThemeId })), ...choices().map((q, i) => ({ ...q, theme: (i % 2 ? 'travel' : 'money') as TThemeId }))];
    for (let seed = 0; seed < 20; seed++) {
      const deck = flash(rows, { themes: ['money'] }, seeded(seed));
      expect(deck.filter(isChoice)).toHaveLength(1);
      expect(deck.every((q) => q.theme === 'money')).toBe(true);
    }
  });

  it('seen ids are excluded, a choice id too; the other choice cards still come', () => {
    const seen = ids(choices()).slice(1); // every choice but 1001 is seen
    for (let seed = 0; seed < 20; seed++) {
      const deck = flash(bank(), { seenIds: seen }, seeded(seed));
      expect(deck.filter(isChoice).map((q) => q.id)).toEqual([1001]);
      expect(deck.every((q) => !seen.includes(q.id))).toBe(true);
    }
  });

  it('no choice left after the filters: four classic cards, no error, no empty deck', () => {
    const allSeen = flash(bank(), { seenIds: ids(choices()) });
    expect(allSeen).toHaveLength(4);
    expect(allSeen.some(isChoice)).toBe(false);
    const hardOnly = flash([...classics(), ...choices().filter((q) => q.difficulty === 'easy')], { difficulty: 'hard' });
    expect(hardOnly).toHaveLength(4);
    expect(hardOnly.some(isChoice)).toBe(false);
    const noBank = flash(classics());
    expect(noBank).toHaveLength(4);
    expect(noBank.some(isChoice)).toBe(false);
  });

  it('a bank of classic questions only draws what it drew before (same ids for the same seed, size 4)', () => {
    const deck = flash(classics(), {}, seeded(4));
    expect(deck.map((q) => q.type).every((t) => t !== 'choice' && t !== 'who_of_two')).toBe(true);
  });
});

describe('short pools never silently shrink a Flash deck', () => {
  // Today a short Flash pool is returned short (fewer than `size`); Difficulty then shows error.deckEmpty because
  // `deck.length < deckNeeded(...)`. A choice card must not turn a short pool into a quietly valid one.
  const flash = (questions: TQuestion[], rng: () => number = seeded(1)) =>
    drawDeck(questions, { mode: 'flash', difficulty: 'mix', themes: [], seenIds: [], size: deckSizeFor('flash', 1) }, rng);
  const some = (n: number) => Array.from({ length: n }, (_, i) => classicRow(i + 1, CLASSIC_FLASH[i % 3]!));

  it('2 classic + 1 choice (3 cards for a 4-card deck): short, as a short classic pool is today, never padded or duplicated', () => {
    for (let seed = 0; seed < 20; seed++) {
      const deck = flash([...some(2), choiceRow(1001)], seeded(seed));
      expect(deck.length).toBeLessThan(deckSizeFor('flash', 1)); // Difficulty's gate (deckNeeded) turns it into error.deckEmpty
      expect(new Set(ids(deck)).size).toBe(deck.length);
    }
  });

  it('a short classic pool with no choice at all behaves exactly as before: the 2 cards it has', () => {
    expect(flash(some(2))).toHaveLength(2);
    expect(flash(some(3))).toHaveLength(3);
    expect(flash([])).toEqual([]);
  });

  it('3 classic + 1 choice is a full, valid deck: 4 cards, one of them the choice', () => {
    for (let seed = 0; seed < 20; seed++) {
      const deck = flash([...some(3), choiceRow(1001)], seeded(seed));
      expect(deck).toHaveLength(4);
      expect(deck.filter(isChoice).map((q) => q.id)).toEqual([1001]);
    }
  });

  it('4 classic and several choice: still 4 cards with one choice (the classic card left out is not an error)', () => {
    expect(flash([...some(4), ...choices(3)])).toHaveLength(4);
    expect(flash([...some(4), ...choices(3)]).filter(isChoice)).toHaveLength(1);
  });
});

describe('Ultime: the Flash block is complete or the deck is short as today', () => {
  // difficulty 'hard': the Flash and Dilemma blocks read hard questions only, rapid-fire falls back to easy / medium open ones,
  // so the size of the Flash block is set by the hard classic Flash questions alone.
  const hardFlash = (n: number) => Array.from({ length: n }, (_, i) => classicRow(1 + i, (['this_or_that', 'yes_no'] as const)[i % 2]!, 'hard'));
  const dilemma = Array.from({ length: 8 }, (_, i) => classicRow(100 + i, 'who_of_two', 'hard'));
  const rapid = Array.from({ length: 30 }, (_, i) => classicRow(200 + i, 'open', 'easy'));
  const draw = (flashRows: TQuestion[], choiceRows: TQuestion[], rng: () => number = seeded(1)) =>
    drawDeck([...flashRows, ...dilemma, ...rapid, ...choiceRows], { mode: 'ultime', difficulty: 'hard', themes: [], seenIds: [], size: deckSizeFor('ultime', 2) }, rng);

  it('2 classic + 1 choice for the 4-card block: the deck is empty, exactly like a short block today (no 3-card block, nothing shifts)', () => {
    for (let seed = 0; seed < 20; seed++) expect(draw(hardFlash(2), [choiceRow(1001, 'hard')], seeded(seed))).toEqual([]);
  });

  it('a short block without any choice is empty as before', () => {
    expect(draw(hardFlash(3), [])).toEqual([]);
  });

  it('3 classic + 1 choice: a full deck, the block of 4 holds the choice, the rest of the layout is intact', () => {
    for (let seed = 0; seed < 20; seed++) {
      const deck = draw(hardFlash(3), [choiceRow(1001, 'hard')], seeded(seed));
      expect(deck).toHaveLength(deckSizeFor('ultime', 2));
      expect(deck.slice(0, 4).filter(isChoice).map((q) => q.id)).toEqual([1001]);
      expect(deck.slice(4, 9).every((q) => q.type === 'who_of_two')).toBe(true);
      expect(deck.slice(9).every((q) => q.type === 'open')).toBe(true);
    }
  });
});

describe('drawDeck, Ultime: the first four cards hold one choice, nothing else does', () => {
  const ultime = (questions: TQuestion[], over: Partial<Parameters<typeof drawDeck>[1]> = {}, couples = 2, rng: () => number = seeded(1)) =>
    drawDeck(questions, { mode: 'ultime', difficulty: 'mix', themes: [], seenIds: [], size: deckSizeFor('ultime', couples), ...over }, rng);
  const big = () => [...Array.from({ length: 400 }, (_, i) => classicRow(i + 1, (['open', 'this_or_that', 'yes_no', 'who_of_two'] as const)[i % 4]!, (['easy', 'medium', 'hard'] as const)[i % 3]!)), ...choices(30)];

  it.each(CONSTANT_RNGS.map((rng, i) => [i, rng] as const))('Flash block: one choice + three classic; Dilemma and rapid-fire: none (constant rng #%i)', (_i, rng) => {
    const deck = ultime(big(), {}, 2, rng);
    expect(deck).toHaveLength(deckSizeFor('ultime', 2));
    expect(deck.slice(0, 4).filter(isChoice)).toHaveLength(1);
    expect(deck.slice(0, 4).filter((q) => !isChoice(q)).every((q) => (CLASSIC_FLASH as readonly string[]).includes(q.type))).toBe(true);
    expect(deck.slice(4, 9).every((q) => q.type === 'who_of_two')).toBe(true);
    expect(deck.slice(9).every((q) => q.type === 'open')).toBe(true);
    expect(deck.slice(4).some(isChoice)).toBe(false);
    expect(new Set(ids(deck)).size).toBe(deck.length);
  });

  it('all four positions of the Flash block are reachable, deterministic per seed', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 300; seed++) positions.add(ultime(big(), {}, 2, seeded(seed)).slice(0, 4).findIndex(isChoice));
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
    expect(ids(ultime(big(), {}, 3, seeded(8)))).toEqual(ids(ultime(big(), {}, 3, seeded(8))));
  });

  it.each([1, 2, 3, 4])('%i couple(s): the layout is the same size as before, rapid-fire stays open', (couples) => {
    for (const difficulty of ['mix', 'easy', 'medium', 'hard'] as const) {
      const deck = ultime(big(), { difficulty }, couples);
      expect(deck).toHaveLength(deckSizeFor('ultime', couples));
      expect(deck.slice(9).every((q) => q.type === 'open' && q.difficulty !== 'hard')).toBe(true);
      expect(deck.slice(4).some(isChoice)).toBe(false);
    }
  });

  it('seen ids and filters apply to the choice card; no choice left: four classic, deck not empty', () => {
    const none = ultime(big(), { seenIds: ids(choices(30)) });
    expect(none).toHaveLength(deckSizeFor('ultime', 2));
    expect(none.some(isChoice)).toBe(false);
    const easyOnly = [...big().filter((q) => !isChoice(q)), ...choices(30).filter((q) => q.difficulty === 'easy')];
    const hard = ultime(easyOnly, { difficulty: 'hard' });
    expect(hard).toHaveLength(deckSizeFor('ultime', 2));
    expect(hard.some(isChoice)).toBe(false);
    const oneLeft = ultime(big(), { seenIds: ids(choices(30)).slice(1) });
    expect(oneLeft.slice(0, 4).filter(isChoice).map((q) => q.id)).toEqual([1001]);
  });
});

describe('Dilemma and rapid-fire never draw a choice card', () => {
  const onlyChoiceHeavy = [...classics(40), ...choices(60)];

  it('Dilemma: who_of_two only', () => {
    for (let seed = 0; seed < 20; seed++) {
      const deck = drawDeck(onlyChoiceHeavy, { mode: 'dilemma', difficulty: 'mix', themes: [], seenIds: [], size: 10 }, seeded(seed));
      expect(deck.length).toBeGreaterThan(0);
      expect(deck.every((q) => q.type === 'who_of_two')).toBe(true);
    }
  });

  it('a bank holding only choice questions gives no Dilemma deck at all', () => {
    expect(drawDeck(choices(30), { mode: 'dilemma', difficulty: 'mix', themes: [], seenIds: [], size: 10 }, seeded(1))).toEqual([]);
  });

  it('rapid-fire (Ultime, every couple count and difficulty): open only', () => {
    for (const couples of [1, 4]) {
      for (const difficulty of ['mix', 'easy', 'medium', 'hard'] as const) {
        const deck = drawDeck(
          [...Array.from({ length: 400 }, (_, i) => classicRow(i + 1, (['open', 'this_or_that', 'yes_no', 'who_of_two'] as const)[i % 4]!, (['easy', 'medium', 'hard'] as const)[i % 3]!)), ...choices(60)],
          { mode: 'ultime', difficulty, themes: [], seenIds: [], size: deckSizeFor('ultime', couples) },
          seeded(couples),
        );
        expect(deck.slice(9).every((q) => q.type === 'open')).toBe(true);
      }
    }
  });
});
