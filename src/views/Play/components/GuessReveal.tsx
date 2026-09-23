import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Chip, ProgressDots, AnswerButton } from '@/shared/Chrome';
import { flashQuestion, flashSetSize, questionText, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'guess' }>;
  guesserName: string;
  partnerName: string;
  onReveal: () => void;
  onAutoGuess: (guess: string) => void;
};

/** V-GuessReveal — the guesser answers out loud; open questions reveal a card,
 *  yes/no are auto-judged on the guesser's pick. */
export const GuessReveal: FC<TProps> = ({ state, guesserName, partnerName, onReveal, onAutoGuess }) => {
  const t = useT();
  const question = flashQuestion(state);
  const isYesNo = question?.type === 'yes_no';
  // who_of_two answers are one of the couple's two names (roster order).
  const twoNames = question?.type === 'who_of_two' ? state.roster[state.coupleIdx]?.players : undefined;

  const handleYes = () => onAutoGuess(t('common.yes'));
  const handleNo = () => onAutoGuess(t('common.no'));

  return (
    <>
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.guessers')}</Chip>
        <ProgressDots total={flashSetSize(state.mode)} current={state.questionIdx} />
      </div>
      <h2 className="cb-h2">{t('guess.turn', { name: guesserName, partner: partnerName })}</h2>

      <PixelPanel>
        <p className="cb-question">{questionText(question, 'name', partnerName) || '—'}</p>
      </PixelPanel>

      {twoNames ? (
        <div className="cb-answers">
          <AnswerButton label={twoNames[0]} tone="p1" onClick={() => onAutoGuess(twoNames[0])} />
          <AnswerButton label={twoNames[1]} tone="p2" onClick={() => onAutoGuess(twoNames[1])} />
        </div>
      ) : isYesNo ? (
        <div className="cb-answers">
          <AnswerButton label={t('common.yes')} tone="p1" onClick={handleYes} />
          <AnswerButton label={t('common.no')} tone="p2" onClick={handleNo} />
        </div>
      ) : (
        <>
          <div className="cb-grow" />
          <p className="cb-muted cb-center" style={{ margin: 0 }}>
            {t('guess.outloud')}
          </p>
          <PixelButton onClick={onReveal}>{t('guess.reveal')}</PixelButton>
        </>
      )}
    </>
  );
};
