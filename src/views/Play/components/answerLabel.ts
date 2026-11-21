import type { TFunc } from '@/shared/i18n';
import { CLOSED_TOKENS, type TGame, type TTeam } from '@/shared/game';
import type { TQuestion, TQuestionType } from '@/shared/questions';
import { cardOf, teamOf } from '../domain/machine';

/**
 * What a stored answer reads as on screen. Closed answers are language-free tokens
 * (yes_no: 'yes' | 'no'; who_of_two: 'p0' | 'p1' = player index in the couple; choice: 'c0' | 'c1' | 'c2'
 * = index into the question's options), shown as the localized word, the player's name or the option
 * text; a typed answer is shown as typed.
 */
export function answerLabel(
  value: string | undefined,
  type: TQuestionType | undefined,
  team: TTeam | undefined,
  t: TFunc,
  question?: TQuestion,
): string | undefined {
  if (value === undefined) return undefined;
  if (type === 'yes_no') return value === 'yes' ? t('common.yes') : value === 'no' ? t('common.no') : value;
  if (type === 'who_of_two') return value === 'p0' ? team?.players[0] : value === 'p1' ? team?.players[1] : value;
  // never the raw token: without its question (bank not loaded) a choice answer has no text
  if (type === 'choice') return question?.type === 'choice' ? question.options[CLOSED_TOKENS.choice?.indexOf(value) ?? -1] : undefined;
  return value;
}

/** The letter a choice answer goes by on screen and to a screen reader: its place in the list (A, B, C). */
export const choiceLetter = (index: number): string => 'ABC'[index] ?? '';

export type TChoice = { token: string; label: string };

/** The answers of the card's closed question (yes / no, the couple's two names, or the three options of a
 *  choice question); null for an open question, and for a choice card whose question is not at hand (the
 *  bank is not loaded): no blank buttons. */
export function closedChoices(game: TGame, t: TFunc, question?: TQuestion): TChoice[] | null {
  const type = cardOf(game)?.type;
  const tokens = (type && CLOSED_TOKENS[type]) || [];
  const choices = tokens.map((token) => ({ token, label: answerLabel(token, type, teamOf(game), t, question) ?? '' }));
  return choices.length > 0 && choices.every((c) => c.label) ? choices : null;
}
