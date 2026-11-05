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
  const pool = filterQuestions(questions, { types: modeQuestionTypes(mode), difficulty, themes, excludeIds: seenIds });
  return shuffle(pool, rng).slice(0, size);
}

/**
 * Ultime reads its deck by fixed offsets (Flash, Dilemma, rapid-fire), so each segment is drawn
 * from its own pool: a short segment would shift the next into the wrong round, so it empties
 * the deck (error.deckEmpty). Rapid-fire draws `open` easy/medium only (Hard falls back to both).
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
  const complete =
    take({ types: modeQuestionTypes(Mode.Flash), difficulty, themes }, FLASH_SHARED) &&
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
