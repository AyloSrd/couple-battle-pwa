import { useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots, AnswerButton } from '@/shared/Chrome';
import { ActorBadge } from './ActorBadge';
import '../flash.css';
import { flashQuestion, flashSetSize, flashTruth, questionText, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'guess' }>;
  guesserName: string;
  partnerName: string;
  onReveal: () => void;
  onAutoGuess: (guess: string) => void;
};

/** V-GuessReveal — the guesser answers out loud; open questions reveal a card,
 *  yes/no and who_of_two are auto-judged on the guesser's pick: the partner's
 *  real answer is shown with the match/miss verdict, then NEXT scores it. */
export const GuessReveal: FC<TProps> = ({ state, guesserName, partnerName, onReveal, onAutoGuess }) => {
  const t = useT();
  const sound = useSoundApi();
  const [picked, setPicked] = useState<string>();
  const question = flashQuestion(state);
  const truth = flashTruth(state);
  const isYesNo = question?.type === 'yes_no';
  // who_of_two answers are one of the couple's two names (roster order).
  const twoNames = question?.type === 'who_of_two' ? state.roster[state.coupleIdx]?.players : undefined;
  const isMatch = picked !== undefined && truth !== undefined && picked === truth;

  const pick = (guess: string) => {
    sound.play(truth !== undefined && guess === truth ? 'sfx.point.exact' : 'sfx.point.miss');
    setPicked(guess);
  };
  const handleYes = () => pick(t('common.yes'));
  const handleNo = () => pick(t('common.no'));
  const handleNext = () => {
    if (picked !== undefined) onAutoGuess(picked);
  };

  return (
    <div className="cb-v-flash cb-v-flash--guess">
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.guessers')}</Chip>
        <ProgressDots total={flashSetSize(state.mode)} current={state.questionIdx} />
      </div>
      <h2 className="cb-h2 cb-flash-lead">{t('guess.turn', { name: guesserName, partner: partnerName })}</h2>

      <PixelPanel className="cb-flash-card cb-flash-card--player">
        <ActorBadge state={state} variant="card" />
        <p className="cb-question">{questionText(question, 'name', partnerName) || '—'}</p>
      </PixelPanel>

      {picked !== undefined ? (
        <>
          <p className="cb-muted cb-flash-hint">{t('guess.answerWas', { name: partnerName })}</p>
          <PixelPanel className={`cb-flash-card cb-flash-card--reveal cb-flash-card--auto cb-reveal-in${isMatch ? ' is-match' : ' is-miss'}`}>
            <p className="cb-question">{truth ?? '—'}</p>
          </PixelPanel>
          <p className="cb-label cb-flash-verdict">{t(isMatch ? 'judge.auto.match' : 'judge.auto.miss')}</p>
          <PixelButton onClick={handleNext}>{t('common.next')}</PixelButton>
        </>
      ) : twoNames ? (
        <div className="cb-answers">
          <AnswerButton label={twoNames[0]} tone="p1" onClick={() => pick(twoNames[0])} />
          <AnswerButton label={twoNames[1]} tone="p2" onClick={() => pick(twoNames[1])} />
        </div>
      ) : isYesNo ? (
        <div className="cb-answers">
          <AnswerButton label={t('common.yes')} tone="p1" onClick={handleYes} />
          <AnswerButton label={t('common.no')} tone="p2" onClick={handleNo} />
        </div>
      ) : (
        <>
          <p className="cb-muted cb-flash-hint">{t('guess.outloud')}</p>
          <PixelButton onClick={onReveal}>{t('guess.reveal')}</PixelButton>
        </>
      )}
    </div>
  );
};
