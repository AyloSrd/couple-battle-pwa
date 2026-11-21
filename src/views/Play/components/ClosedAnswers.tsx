import type { FC } from 'react';
import type { TSoundId } from '@/shared/sound';
import { AnswerButton } from '@/shared/Chrome';
import type { TChoice } from './answerLabel';

type TProps = {
  choices: TChoice[];
  sfx: TSoundId | null;
  onPick: (token: string) => void;
};

type TAnswerProps = { choice: TChoice; tone: 'p1' | 'p2'; sfx: TSoundId | null; onPick: (token: string) => void };

const Answer: FC<TAnswerProps> = ({ choice, tone, sfx, onPick }) => {
  const handleClick = () => onPick(choice.token);
  return <AnswerButton label={choice.label} tone={tone} sfx={sfx} onClick={handleClick} />;
};

/** A closed question's answer buttons (yes / no, the couple's two names: first violet, second pink); a tap picks
 *  the answer's language-free token. A choice question has its own list: `ChoiceList`. */
export const ClosedAnswers: FC<TProps> = ({ choices, sfx, onPick }) => (
  <div className="cb-answers">
    {choices.map((choice, index) => (
      <Answer key={choice.token} choice={choice} tone={index === 0 ? 'p1' : 'p2'} sfx={sfx} onPick={onPick} />
    ))}
  </div>
);
