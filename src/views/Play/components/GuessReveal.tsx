import { useState, type AnimationEvent, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots, AnswerButton } from '@/shared/Chrome';
import type { TQuestion } from '@/shared/questions';
import type { TDispatch } from '../application/game';
import { cardOf, flashNames, questionText, secretOf, segmentLength, teamOf, type TGameAt } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import { answerLabel } from './answerLabel';
import '../flash.css';

type TProps = {
  game: TGameAt<'guess'>;
  question: TQuestion | undefined;
  dispatch: TDispatch;
};

/** V-GuessReveal — the guesser answers out loud; open questions reveal a card,
 *  yes/no and who_of_two are auto-judged on the guesser's pick: the partner's
 *  real answer is shown with the match/miss verdict, then NEXT scores the pick's token
 *  ('yes' | 'no', 'p0' | 'p1'). Mounted with a key per slot. */
export const GuessReveal: FC<TProps> = ({ game, question, dispatch }) => {
  const t = useT();
  const sound = useSound();
  const [picked, setPicked] = useState<string>();
  const { guesserName, answererName: partnerName } = flashNames(game);
  const type = cardOf(game)?.type;
  const truth = secretOf(game);
  const isYesNo = type === 'yes_no';
  // who_of_two answers are one of the couple's two names (roster order), picked as p0 | p1.
  const twoNames = type === 'who_of_two' ? teamOf(game)?.players : undefined;
  const isMatch = picked !== undefined && truth !== undefined && picked === truth;

  // GF4: the pick plays the riser (its buttons are silent), the answer card flips over, and the
  // match / miss sound plays as it lands.
  const pick = (guess: string) => {
    sound.play('sfx.reveal');
    setPicked(guess);
  };
  const handleCardLanded = (event: AnimationEvent<HTMLDivElement>) => {
    // the card's own flip — not its face-down back (`::after`) ending at the same moment
    if (event.target !== event.currentTarget || event.pseudoElement) return;
    sound.play(isMatch ? 'sfx.point.exact' : 'sfx.point.miss');
  };
  const handleYes = () => pick('yes');
  const handleNo = () => pick('no');
  const handleFirst = () => pick('p0');
  const handleSecond = () => pick('p1');
  const handleNext = () => {
    if (picked !== undefined) dispatch({ type: 'guess', value: picked });
  };
  // the riser plays on the Judge (flip) mount
  const handleReveal = () => dispatch({ type: 'next' });

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
          <PixelPanel
            className={`cb-flash-card cb-flash-card--reveal cb-flash-card--auto cb-flash-card--flip${isMatch ? ' is-match' : ' is-miss'}`}
            onAnimationEnd={handleCardLanded}
          >
            <p className="cb-question">{answerLabel(truth, type, teamOf(game), t) ?? '—'}</p>
          </PixelPanel>
          <p className="cb-label cb-flash-verdict cb-flash-verdict--landed">{t(isMatch ? 'judge.auto.match' : 'judge.auto.miss')}</p>
          <PixelButton size="lg" onClick={handleNext}>{t('common.next')}</PixelButton>
        </>
      ) : twoNames ? (
        <div className="cb-answers">
          <AnswerButton label={twoNames[0]} tone="p1" sfx={null} onClick={handleFirst} />
          <AnswerButton label={twoNames[1]} tone="p2" sfx={null} onClick={handleSecond} />
        </div>
      ) : isYesNo ? (
        <div className="cb-answers">
          <AnswerButton label={t('common.yes')} tone="p1" sfx={null} onClick={handleYes} />
          <AnswerButton label={t('common.no')} tone="p2" sfx={null} onClick={handleNo} />
        </div>
      ) : (
        <>
          <p className="cb-muted cb-flash-hint">{t('guess.outloud')}</p>
          <PixelButton size="lg" onClick={handleReveal}>{t('guess.reveal')}</PixelButton>
        </>
      )}
    </div>
  );
};
