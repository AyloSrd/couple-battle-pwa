import { useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots, AnswerButton } from '@/shared/Chrome';
import { ActorBadge } from './ActorBadge';
import '../flash.css';
import type { TQuestion } from '@/shared/questions';
import { cardOf, questionText, secretOf, segmentLength, teamOf, type TGameAt } from '../domain/machine';
import { answerLabel } from './answerLabel';

type TProps = {
  game: TGameAt<'guess'>;
  question: TQuestion | undefined;
  guesserName: string;
  partnerName: string;
  onReveal: () => void;
  /** A closed question's pick, as a token ('yes' | 'no', 'p0' | 'p1'). */
  onAutoGuess: (guess: string) => void;
};

/** V-GuessReveal — the guesser answers out loud; open questions reveal a card,
 *  yes/no and who_of_two are auto-judged on the guesser's pick: the partner's
 *  real answer is shown with the match/miss verdict, then NEXT scores it. */
export const GuessReveal: FC<TProps> = ({ game, question, guesserName, partnerName, onReveal, onAutoGuess }) => {
  const t = useT();
  const sound = useSoundApi();
  const [picked, setPicked] = useState<string>();
  const type = cardOf(game)?.type;
  const truth = secretOf(game);
  const isYesNo = type === 'yes_no';
  // who_of_two answers are one of the couple's two names (roster order), picked as p0 | p1.
  const twoNames = type === 'who_of_two' ? teamOf(game)?.players : undefined;
  const isMatch = picked !== undefined && truth !== undefined && picked === truth;

  const pick = (guess: string) => {
    sound.play(truth !== undefined && guess === truth ? 'sfx.point.exact' : 'sfx.point.miss');
    setPicked(guess);
  };
  const handleYes = () => pick('yes');
  const handleNo = () => pick('no');
  const handleFirst = () => pick('p0');
  const handleSecond = () => pick('p1');
  const handleNext = () => {
    if (picked !== undefined) onAutoGuess(picked);
  };

  return (
    <div className="cb-v-flash cb-v-flash--guess">
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.guessers')}</Chip>
        <ProgressDots total={segmentLength(game.ctx)} current={game.step.q} />
      </div>
      <h2 className="cb-h2 cb-flash-lead">{t('guess.turn', { name: guesserName, partner: partnerName })}</h2>

      <PixelPanel className="cb-flash-card cb-flash-card--player">
        <ActorBadge game={game} variant="card" />
        <p className="cb-question">{questionText(question, 'name', partnerName) || '—'}</p>
      </PixelPanel>

      {picked !== undefined ? (
        <>
          <p className="cb-muted cb-flash-hint">{t('guess.answerWas', { name: partnerName })}</p>
          <PixelPanel className={`cb-flash-card cb-flash-card--reveal cb-flash-card--auto cb-reveal-in${isMatch ? ' is-match' : ' is-miss'}`}>
            <p className="cb-question">{answerLabel(truth, type, teamOf(game), t) ?? '—'}</p>
          </PixelPanel>
          <p className="cb-label cb-flash-verdict">{t(isMatch ? 'judge.auto.match' : 'judge.auto.miss')}</p>
          <PixelButton onClick={handleNext}>{t('common.next')}</PixelButton>
        </>
      ) : twoNames ? (
        <div className="cb-answers">
          <AnswerButton label={twoNames[0]} tone="p1" onClick={handleFirst} />
          <AnswerButton label={twoNames[1]} tone="p2" onClick={handleSecond} />
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
