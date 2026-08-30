import { GameDifficulty } from '@/shared/game/domain/types';
import type { TQuestion, TQuestionFilter } from './types';

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
