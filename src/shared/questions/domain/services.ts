import { GameDifficulty, Mode } from '@/shared/game/domain/types';
import type { TMode, TGameDifficulty, TThemeId } from '@/shared/game/domain/types';
import { QuestionType } from './types';
import type { TQuestion, TQuestionFilter, TQuestionType } from './types';

/**
 * Pure filter shared by every adapter. `lang` is handled by the adapter (it
 * picks the source array); everything else is applied here.
 *
 * - `difficulty: 'mix'` (or omitted) → no difficulty constraint
 * - `types` / `themes` empty or omitted → no constraint on that axis
 * - `excludeIds` removes already-seen questions
 */
export function filterQuestions(
  questions: TQuestion[],
  filter: Omit<TQuestionFilter, 'lang'>,
): TQuestion[] {
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

/** Which question types a mode draws from. Ultime reuses the Flash set at start. */
export function modeQuestionTypes(mode: TMode): TQuestionType[] {
  if (mode === Mode.Dilemma) return [QuestionType.WhoOfTwo];
  return [QuestionType.Open, QuestionType.ThisOrThat, QuestionType.YesNo];
}

export type TDrawDeckOptions = {
  mode: TMode;
  difficulty: TGameDifficulty;
  themes: TThemeId[];
  seenIds: number[];
  size: number;
};

/**
 * Draw a deck at game start: filter by mode-compatible types + difficulty +
 * themes, exclude already-seen ids, shuffle, take `size`. `rng` is injectable
 * for deterministic tests. May return fewer than `size` if the pool is small
 * (caller decides how to handle an empty pool — see error.deckEmpty).
 */
export function drawDeck(
  questions: TQuestion[],
  options: TDrawDeckOptions,
  rng: () => number = Math.random,
): TQuestion[] {
  const { mode, difficulty, themes, seenIds, size } = options;
  const pool = filterQuestions(questions, {
    types: modeQuestionTypes(mode),
    difficulty,
    themes,
    excludeIds: seenIds,
  });
  return shuffle(pool, rng).slice(0, size);
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
