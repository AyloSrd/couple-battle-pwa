import { GameDifficulty, Mode } from '@/shared/game/domain/types';
import type { TMode, TGameDifficulty, TThemeId } from '@/shared/game/domain/types';
import { QuestionType } from './types';
import type { TQuestion, TQuestionFilter, TQuestionType } from './types';

/** Pure filter shared by every adapter (`lang` picks the adapter's array). `mix`, an empty or
 *  omitted list → no constraint on that axis; `excludeIds` drops already-seen questions. */
export function filterQuestions(questions: TQuestion[], filter: Omit<TQuestionFilter, 'lang'>): TQuestion[] {
  const { types, difficulty, themes, excludeIds } = filter;
  const typeSet = types && types.length > 0 ? new Set(types) : null;
  const themeSet = themes && themes.length > 0 ? new Set(themes) : null;
  const excludeSet = excludeIds && excludeIds.length > 0 ? new Set(excludeIds) : null;
  const byDifficulty = difficulty && difficulty !== GameDifficulty.Mix ? difficulty : null;

  return questions.filter((q) => {
    if (typeSet && !typeSet.has(q.type)) return false;
    if (byDifficulty && q.difficulty !== byDifficulty) return false;
    if (themeSet && !themeSet.has(q.theme)) return false;
    if (excludeSet && excludeSet.has(q.id)) return false;
    return true;
  });
}

/** Which question types a mode draws from. Ultime's own segments: see `drawUltimeDeck`. */
export function modeQuestionTypes(mode: TMode): TQuestionType[] {
  if (mode === Mode.Dilemma) return [QuestionType.WhoOfTwo];
  return [QuestionType.Open, QuestionType.ThisOrThat, QuestionType.YesNo];
}

/** Flash draws 2 questions per round, SHARED by every couple, over 2 rounds. */
const FLASH_SHARED = 2 * 2;
const ULTIME_DILEMMA = 5;
/** Choice cards per block of Flash questions (Flash's deck, Ultime's Flash block): exactly this many, not a chance per card. */
export const CHOICE_PER_FLASH_BLOCK = 1;
const ULTIME_RAPID_PER_COUPLE = 5;

/** Deck size to draw (mirrors `planOf`): Dilemma 10; Flash 2 × 2 rounds whatever the couple
 *  count; Ultime the Flash block + 5 Dilemma + 5 rapid-fire per couple. */
export function deckSizeFor(mode: TMode, coupleCount: number): number {
  if (mode === Mode.Flash) return FLASH_SHARED;
  if (mode === Mode.Ultime) return FLASH_SHARED + ULTIME_DILEMMA + ULTIME_RAPID_PER_COUPLE * coupleCount;
  return 10;
}

export type TDrawDeckOptions = {
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  seenIds: number[];
  size: number;
};

/** Draw a deck at game start: mode-compatible, unseen, shuffled, `size` at most (fewer when the
 *  pool is small; empty → error.deckEmpty). Ultime is drawn segment by segment. */
export function drawDeck(
  questions: TQuestion[],
  options: TDrawDeckOptions,
  rng: () => number = Math.random,
): TQuestion[] {
  if (options.mode === Mode.Ultime) return drawUltimeDeck(questions, options, rng);
  const { mode, difficulty, themes, seenIds, size } = options;
  if (mode === Mode.Flash) return drawFlashBlock(...flashPools(questions, options, seenIds), size, rng);
  const pool = filterQuestions(questions, { types: modeQuestionTypes(mode), difficulty, themes, excludeIds: seenIds });
  return shuffle(pool, rng).slice(0, size);
}

/** The classic Flash pool and the choice pool, filtered alike (difficulty, themes, unseen). */
function flashPools(
  questions: TQuestion[],
  { difficulty, themes }: TDrawDeckOptions,
  excludeIds: number[],
): [classicPool: TQuestion[], choicePool: TQuestion[]] {
  const filter = { difficulty, themes, excludeIds };
  return [
    filterQuestions(questions, { ...filter, types: modeQuestionTypes(Mode.Flash) }),
    filterQuestions(questions, { ...filter, types: [QuestionType.Choice] }),
  ];
}

/**
 * A block of `count` Flash cards: up to CHOICE_PER_FLASH_BLOCK choice cards, each at a random slot, the rest classic. No choice
 * left in its pool → all classic; a short classic pool → a short block (never padded, never a duplicate), so callers keep their
 * short-deck handling. Pure: the pools are not touched.
 */
export function drawFlashBlock(classicPool: TQuestion[], choicePool: TQuestion[], count: number, rng: () => number): TQuestion[] {
  const choices = shuffle(choicePool, rng).slice(0, Math.min(CHOICE_PER_FLASH_BLOCK, count));
  const block = shuffle(classicPool, rng).slice(0, count - choices.length);
  for (const choice of choices) block.splice(Math.floor(rng() * (block.length + 1)), 0, choice);
  return block;
}

/**
 * Ultime reads its deck by fixed offsets (Flash, Dilemma, rapid-fire), so each segment is drawn
 * from its own pool: a short segment would shift the next into the wrong round, so it empties
 * the deck (error.deckEmpty). The Flash block holds one choice card (`drawFlashBlock`). Rapid-fire draws `open` easy/medium only (Hard falls back to both).
 */
function drawUltimeDeck(questions: TQuestion[], options: TDrawDeckOptions, rng: () => number): TQuestion[] {
  const { difficulty, themes, seenIds, size } = options;
  const deck: TQuestion[] = [];
  const take = (
    filter: Omit<TQuestionFilter, 'lang' | 'excludeIds'>,
    count: number,
    keep: (q: TQuestion) => boolean = () => true,
  ): boolean => {
    const pool = filterQuestions(questions, { ...filter, excludeIds: [...seenIds, ...deck.map((q) => q.id)] });
    const drawn = shuffle(pool.filter(keep), rng).slice(0, count);
    deck.push(...drawn);
    return drawn.length === count;
  };

  const rapidDifficulty =
    difficulty === GameDifficulty.Easy || difficulty === GameDifficulty.Medium ? difficulty : GameDifficulty.Mix;
  const flashBlock = drawFlashBlock(...flashPools(questions, options, seenIds), FLASH_SHARED, rng);
  deck.push(...flashBlock);
  const complete =
    flashBlock.length === FLASH_SHARED &&
    take({ types: modeQuestionTypes(Mode.Dilemma), difficulty, themes }, ULTIME_DILEMMA) &&
    take(
      { types: [QuestionType.Open], difficulty: rapidDifficulty, themes },
      size - FLASH_SHARED - ULTIME_DILEMMA,
      (q) => q.difficulty !== GameDifficulty.Hard,
    );
  return complete ? deck : [];
}

function shuffle<T>(input: T[], rng: () => number): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}
