import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots } from '@/shared/Chrome';
import '../flash.css';
import { flashQuestion, flashSetSize, flashTruth, questionText, type TGameState, type TVerdict } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'judge' }>;
  answererName: string;
  onJudge: (verdict: TVerdict) => void;
};

/** V-Judge — the revealed answer, scored by the table (exact / close / miss). */
export const Judge: FC<TProps> = ({ state, answererName, onJudge }) => {
  const t = useT();
  const sound = useSoundApi();
  const question = flashQuestion(state);
  const answer = flashTruth(state);

  // The reveal / card-flip moment.
  useEffect(() => {
    sound.play('sfx.reveal');
  }, [sound]);

  const makeVerdict = (verdict: TVerdict) => () => onJudge(verdict);

  return (
    <div className="cb-v-flash cb-v-flash--judge">
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.guessers')}</Chip>
        <ProgressDots total={flashSetSize(state.mode)} current={state.questionIdx} />
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
