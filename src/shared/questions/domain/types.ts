import { z } from 'zod';
import { ZThemeIdSchema } from '@/shared/game/domain/types';
import type { TGameDifficulty, TThemeId } from '@/shared/game/domain/types';
import type { TLang } from '@/shared/i18n/domain/types';

/** Question interaction type — drives the input/guess UI. */
export const QuestionType = {
  Open: 'open',
  ThisOrThat: 'this_or_that',
  YesNo: 'yes_no',
  WhoOfTwo: 'who_of_two',
} as const;
export type TQuestionType = (typeof QuestionType)[keyof typeof QuestionType];
export const ZQuestionTypeSchema = z.enum(['open', 'this_or_that', 'yes_no', 'who_of_two']);

/** A question's intrinsic difficulty (no `mix`). */
export const ZQuestionDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type TQuestionDifficulty = z.infer<typeof ZQuestionDifficultySchema>;

/** Ids are language-independent (same id across fr/en). */
export const ZQuestionSchema = z.object({
  id: z.number().int().positive(),
  theme: ZThemeIdSchema,
  difficulty: ZQuestionDifficultySchema,
  type: ZQuestionTypeSchema,
  text: z.string().min(1),
});
export type TQuestion = z.infer<typeof ZQuestionSchema>;

/** Selection criteria for `list`. `lang` picks the source file. */
export type TQuestionFilter = {
  lang: TLang;
  types?: TQuestionType[];
  difficulty?: TGameDifficulty;
  themes?: TThemeId[];
  excludeIds?: number[];
};
