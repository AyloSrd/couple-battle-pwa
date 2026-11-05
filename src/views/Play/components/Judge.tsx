import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots } from '@/shared/Chrome';
import type { TScreenProps } from '../application/game';
import { cardOf, flashNames, questionText, secretOf, segmentLength, teamOf } from '../domain/machine';
import { answerLabel } from './answerLabel';
import '../flash.css';

/** V-Judge — the revealed answer, scored by the table (exact / close / miss). */
export const Judge: FC<TScreenProps<'judge'>> = ({ game, question, dispatch }) => {
  const t = useT();
  const sound = useSound();
  const { answererName } = flashNames(game);
  const answer = answerLabel(secretOf(game), cardOf(game)?.type, teamOf(game), t);
  // GF4: the riser plays first, then the card flips over (CSS, ~500 ms) and the answer lands.
  useEffect(() => {
    sound.play('sfx.reveal');
  }, [sound]);
  const handleExact = () => dispatch({ type: 'verdict', v: 'exact' });
  const handleClose = () => dispatch({ type: 'verdict', v: 'close' });
  const handleMiss = () => dispatch({ type: 'verdict', v: 'miss' });

  return (
    <div className="cb-v-flash cb-v-flash--judge">
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.guessers')}</Chip>
        <ProgressDots total={segmentLength(game.ctx)} current={game.step.q} />
      </div>
      <h2 className="cb-h2 cb-flash-lead">{questionText(question, 'name', answererName) || '—'}</h2>
      <p className="cb-muted cb-flash-hint">
        {t('guess.answerWas', { name: answererName })}
      </p>
      {/* the reveal card: face down for the riser, then it flips */}
      <PixelPanel className="cb-flash-card cb-flash-card--reveal cb-flash-card--flip">
        <p className="cb-question">{answer ?? '—'}</p>
      </PixelPanel>
      <p className="cb-label cb-flash-verdict">{t('judge.title')}</p>
      <div className="cb-stack cb-flash-verdicts">
        <PixelButton variant="positive" size="lg" sfx="sfx.point.exact" onClick={handleExact}>
          {t('judge.exact')}
        </PixelButton>
        <PixelButton variant="win" size="lg" sfx="sfx.point.close" onClick={handleClose}>
          {t('judge.close')}
        </PixelButton>
        <PixelButton variant="negative" size="lg" sfx="sfx.point.miss" onClick={handleMiss}>
          {t('judge.miss')}
        </PixelButton>
      </div>
    </div>
  );
};
