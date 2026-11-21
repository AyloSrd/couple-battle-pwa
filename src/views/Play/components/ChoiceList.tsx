import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound, type TSoundId } from '@/shared/sound';
import { choiceLetter, type TChoice } from './answerLabel';
import '../flash.css';

type TPick = { mode: 'pick'; choices: TChoice[]; onPick: (token: string) => void; sfx?: TSoundId | null };
type TResult = { mode: 'result'; choices: TChoice[]; truth: string; picked: string; truthName: string; pickedName: string };

type TCardProps = { choice: TChoice; index: number };

/** One answer to tap: a button named "A. <text>" that plays its cue, then reports its token. */
const PickCard: FC<TCardProps & { sfx: TSoundId | null; onPick: (token: string) => void }> = ({ choice, index, sfx, onPick }) => {
  const sound = useSound();
  const handleClick = () => {
    if (sfx) sound.play(sfx);
    onPick(choice.token);
  };
  return (
    <button type="button" className="cb-choice" data-token={choice.token} aria-label={`${choiceLetter(index)}. ${choice.label}`} onClick={handleClick}>
      <span className="cb-choice__letter">{choiceLetter(index)}</span>
      <span className="cb-choice__text">{choice.label}</span>
    </button>
  );
};

/** The three answers of a choice question, in one list for both screens (the answerer's lock, the guesser's pick and its
 *  result). Result: inert, one named element per card; the real answer is ringed in gold, the guess is mint when it matched
 *  and rose when it missed, and a gold tag names whose answer and whose guess each card is (both on one card on a match). */
export const ChoiceList: FC<TPick | TResult> = (props) => {
  const t = useT();
  if (props.mode === 'pick') {
    return (
      <div className="cb-choice-list" role="group">
        {props.choices.map((choice, index) => (
          <PickCard key={choice.token} choice={choice} index={index} sfx={props.sfx === undefined ? 'sfx.tap' : props.sfx} onPick={props.onPick} />
        ))}
      </div>
    );
  }
  const { truth, picked, truthName, pickedName } = props;
  return (
    <div className="cb-choice-list" role="list">
      {props.choices.map(({ token, label }, index) => {
        const isTruth = token === truth;
        const isPick = token === picked;
        const names = [...(isTruth ? [truthName] : []), ...(isPick ? [pickedName] : [])];
        const said = [
          `${choiceLetter(index)}. ${label}`,
          ...(isTruth ? [t('choice.answer', { name: truthName })] : []),
          ...(isPick ? [t('choice.guess', { name: pickedName })] : []),
        ];
        const classes = ['cb-choice', isTruth && 'is-truth', isPick && 'is-pick', isPick && (isTruth ? 'is-match' : 'is-miss')].filter(Boolean).join(' ');
        return (
          <div key={token} className={classes} data-token={token} role="listitem" aria-label={said.join(', ')}>
            <span className="cb-choice__letter">{choiceLetter(index)}</span>
            <span className="cb-choice__text">{label}</span>
            {names.map((name) => (
              <span key={name} className="cb-choice__tag">{name}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
};
