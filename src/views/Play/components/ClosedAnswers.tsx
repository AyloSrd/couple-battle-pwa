import type { FC } from 'react';
import type { TSoundId } from '@/shared/sound';
import { AnswerButton } from '@/shared/Chrome';
import type { TChoice } from './answerLabel';

type TProps = {
  choices: [TChoice, TChoice];
  sfx: TSoundId | null;
  onPick: (token: string) => void;
};

/** A closed question's two answer buttons; a tap picks the answer's language-free token. */
export const ClosedAnswers: FC<TProps> = ({ choices: [first, second], sfx, onPick }) => {
  const handleFirst = () => onPick(first.token);
  const handleSecond = () => onPick(second.token);
  return (
    <div className="cb-answers">
      <AnswerButton label={first.label} tone="p1" sfx={sfx} onClick={handleFirst} />
      <AnswerButton label={second.label} tone="p2" sfx={sfx} onClick={handleSecond} />
    </div>
  );
};
