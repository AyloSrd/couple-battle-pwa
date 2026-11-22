import { useRef, useState, type AnimationEvent, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots } from '@/shared/Chrome';
import type { TScreenProps } from '../application/game';
import { cardOf, flashNames, questionText, secretOf, segmentLength, teamOf } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import { answerLabel, closedChoices } from './answerLabel';
import { ChoiceList } from './ChoiceList';
import { ClosedAnswers } from './ClosedAnswers';
import '../flash.css';

/** V-GuessReveal — the guesser answers out loud: an open question reveals (Judge), a closed one is
 *  auto-judged on the pick, then NEXT scores it. Mounted with a key per slot. */
export const GuessReveal: FC<TScreenProps<'guess'>> = ({ game, question, dispatch }) => {
  const t = useT();
  const sound = useSound();
  const [picked, setPicked] = useState<string>();
  const [landed, setLanded] = useState(false);
  const { guesserName, answererName: partnerName } = flashNames(game);
  const choices = closedChoices(game, t, question);
  const isChoice = cardOf(game)?.type === 'choice';
  const pickMade = useRef(false);
  const truth = secretOf(game);
  const isMatch = picked !== undefined && truth !== undefined && picked === truth;
  // GF4: the riser on the pick (silent buttons), the card flips, match / miss as it lands — or
  // at once when NEXT comes first, so the outcome always sounds exactly once.
  const land = (match: boolean) => {
    if (landed) return;
    setLanded(true);
    sound.play(match ? 'sfx.point.exact' : 'sfx.point.miss');
  };
  const handlePick = (guess: string) => {
    if (pickMade.current) return; // two taps in the same tick: the first card wins
    pickMade.current = true;
    sound.play('sfx.reveal');
    setPicked(guess);
    // a choice list has no card to flip: its result is drawn at the pick, so its point cue is the pick's
    if (isChoice) land(guess === truth);
  };
  const handleCardLanded = (event: AnimationEvent<HTMLDivElement>) => {
    // the card's own flip — not its face-down back (`::after`) ending at the same moment
    if (event.target === event.currentTarget && !event.pseudoElement) land(isMatch);
  };
  const handleNext = () => {
    if (picked === undefined) return;
    land(isMatch);
    dispatch({ type: 'guess', value: picked });
  };
  const handleReveal = () => dispatch({ type: 'next' }); // the riser plays on the Judge mount

  return (
    <div className="cb-v-flash cb-v-flash--guess">
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.guessers')}</Chip>
        <ProgressDots total={segmentLength(game.ctx)} current={game.step.q} />
      </div>
      <h2 className="cb-h2 cb-flash-lead">{t('guess.turn', { name: guesserName, partner: partnerName })}</h2>
      <PixelPanel className={`cb-flash-card cb-flash-card--player${isChoice ? ' cb-flash-card--choice' : ''}`}>
        <ActorBadge game={game} variant="card" />
        <p className="cb-question">{questionText(question, 'name', partnerName) || '—'}</p>
      </PixelPanel>
      {picked !== undefined && isChoice && choices && truth !== undefined ? (
        <>
          <ChoiceList mode="result" choices={choices} truth={truth} picked={picked} truthName={partnerName} pickedName={guesserName} />
          <p className="cb-label cb-flash-verdict">{t(isMatch ? 'judge.auto.match' : 'judge.auto.miss')}</p>
          <PixelButton size="lg" onClick={handleNext}>
            {t('common.next')}
          </PixelButton>
        </>
      ) : picked !== undefined ? (
        <>
          <p className="cb-muted cb-flash-hint">{t('guess.answerWas', { name: partnerName })}</p>
          <PixelPanel
            className={`cb-flash-card cb-flash-card--reveal cb-flash-card--auto cb-flash-card--flip${isMatch ? ' is-match' : ' is-miss'}`}
            onAnimationEnd={handleCardLanded}
          >
            <p className="cb-question">{answerLabel(truth, cardOf(game)?.type, teamOf(game), t, question) ?? '—'}</p>
          </PixelPanel>
          <p className="cb-label cb-flash-verdict cb-flash-verdict--landed">{t(isMatch ? 'judge.auto.match' : 'judge.auto.miss')}</p>
          <PixelButton size="lg" onClick={handleNext}>
            {t('common.next')}
          </PixelButton>
        </>
      ) : choices && isChoice ? (
        <ChoiceList mode="pick" choices={choices} sfx={null} onPick={handlePick} />
      ) : choices ? (
        <ClosedAnswers choices={choices} sfx={null} onPick={handlePick} />
      ) : (
        <>
          <p className="cb-muted cb-flash-hint">{t('guess.outloud')}</p>
          <PixelButton size="lg" onClick={handleReveal}>
            {t('guess.reveal')}
          </PixelButton>
        </>
      )}
    </div>
  );
};
