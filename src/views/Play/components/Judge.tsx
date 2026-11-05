import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots } from '@/shared/Chrome';
import '../flash.css';
import type { TQuestion } from '@/shared/questions';
import { cardOf, questionText, secretOf, segmentLength, teamOf, type TGameAt, type TVerdict } from '../domain/machine';
import { answerLabel } from './answerLabel';

type TProps = {
  game: TGameAt<'judge'>;
  question: TQuestion | undefined;
  answererName: string;
  onJudge: (verdict: TVerdict) => void;
};

/** V-Judge — the revealed answer, scored by the table (exact / close / miss). */
export const Judge: FC<TProps> = ({ game, question, answererName, onJudge }) => {
  const t = useT();
  const sound = useSound();
  const answer = answerLabel(secretOf(game), cardOf(game)?.type, teamOf(game), t);

  // The reveal / card-flip moment.
  useEffect(() => {
    sound.play('sfx.reveal');
  }, [sound]);

  const makeVerdict = (verdict: TVerdict) => () => onJudge(verdict);

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

      {/* the reveal card */}
      <PixelPanel className="cb-flash-card cb-flash-card--reveal cb-reveal-in">
        <p className="cb-question">{answer ?? '—'}</p>
      </PixelPanel>

      <p className="cb-label cb-flash-verdict">{t('judge.title')}</p>
      <div className="cb-stack cb-flash-verdicts">
        <PixelButton variant="positive" onClick={makeVerdict('exact')}>
          {t('judge.exact')}
        </PixelButton>
        <PixelButton variant="win" onClick={makeVerdict('close')}>
          {t('judge.close')}
        </PixelButton>
        <PixelButton variant="negative" onClick={makeVerdict('miss')}>
          {t('judge.miss')}
        </PixelButton>
      </div>
    </div>
  );
};
