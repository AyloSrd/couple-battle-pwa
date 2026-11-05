import type { TFunc } from '@/shared/i18n';
import { CLOSED_TOKENS, type TGame, type TTeam } from '@/shared/game';
import type { TQuestionType } from '@/shared/questions';
import { cardOf, teamOf } from '../domain/machine';

/**
 * What a stored answer reads as on screen. Closed answers are language-free tokens
 * (yes_no: 'yes' | 'no'; who_of_two: 'p0' | 'p1' = player index in the couple), shown as the
 * localized word or the player's name; a typed answer is shown as typed.
 */
export function answerLabel(
  value: string | undefined,
  type: TQuestionType | undefined,
  team: TTeam | undefined,
  t: TFunc,
): string | undefined {
  if (value === undefined) return undefined;
  if (type === 'yes_no') return value === 'yes' ? t('common.yes') : value === 'no' ? t('common.no') : value;
  if (type === 'who_of_two') return value === 'p0' ? team?.players[0] : value === 'p1' ? team?.players[1] : value;
  return value;
}

export type TChoice = { token: string; label: string };

/** The two answers of the card's closed question (yes / no, or the couple's two names); null for
 *  an open question. */
export function closedChoices(game: TGame, t: TFunc): [TChoice, TChoice] | null {
  const type = cardOf(game)?.type;
  const tokens = (type && CLOSED_TOKENS[type]) || [];
  const [a, b] = tokens.map((token) => ({ token, label: answerLabel(token, type, teamOf(game), t) ?? '' }));
  return a?.label && b?.label ? [a, b] : null;
}
