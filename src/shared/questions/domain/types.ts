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
  Choice: 'choice',
} as const;
export type TQuestionType = (typeof QuestionType)[keyof typeof QuestionType];
export const ZQuestionTypeSchema = z.enum(['open', 'this_or_that', 'yes_no', 'who_of_two', 'choice']);

/** A question's intrinsic difficulty (no `mix`). */
export const ZQuestionDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type TQuestionDifficulty = z.infer<typeof ZQuestionDifficultySchema>;

const ZBaseQuestionSchema = z.object({
  id: z.number().int().positive(),
  theme: ZThemeIdSchema,
  difficulty: ZQuestionDifficultySchema,
});

/** Ids are language-independent. `you` addresses the answerer ("ton petit-déj ?"); `name` the table,
 *  with a `{name}` slot ("le petit-déj de {name} ?"). `who_of_two`: both the same, no slot. */
const ZClassicQuestionSchema = ZBaseQuestionSchema.extend({
  type: z.enum(['open', 'this_or_that', 'yes_no', 'who_of_two']),
  you: z.string().min(1).max(500),
  name: z.string().min(1).max(500),
});

/** `choice`: one `question` read the same by the answerer and the guesser (no `{name}` slot), and three answers; the stored
 *  answer is the token `c0` | `c1` | `c2`, the index into `options`. */
const ZChoiceText = z.string().min(1).max(200);
const ZChoiceQuestionSchema = ZBaseQuestionSchema.extend({
  type: z.literal('choice'),
  question: ZChoiceText,
  options: z.tuple([ZChoiceText, ZChoiceText, ZChoiceText]),
});

export const ZQuestionSchema = z.discriminatedUnion('type', [ZClassicQuestionSchema, ZChoiceQuestionSchema]);
export type TQuestion = z.infer<typeof ZQuestionSchema>;

/** Selection criteria for `list`. `lang` picks the source file. */
export type TQuestionFilter = {
  lang: TLang;
  types?: TQuestionType[];
  difficulty?: TGameDifficulty;
  themes?: TThemeId[];
  excludeIds?: number[];
};
