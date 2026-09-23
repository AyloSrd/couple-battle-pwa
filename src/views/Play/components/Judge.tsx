import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton } from '@/shared/Chrome';
import { flashQuestion, flashTruth, questionText, type TGameState, type TVerdict } from '../domain/machine';

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
    <>
      <h2 className="cb-h2">{questionText(question, 'name', answererName) || '—'}</h2>
      <p className="cb-muted" style={{ margin: 0 }}>
        {t('guess.answerWas', { name: answererName })}
      </p>

      {/* the reveal card */}
      <PixelPanel className="cb-reveal-in cb-center" style={{ padding: 'var(--cb-s7) var(--cb-s5)' }}>
        <p className="cb-question">{answer ?? '—'}</p>
      </PixelPanel>

      <div className="cb-grow" />
      <p className="cb-label cb-center">{t('judge.title')}</p>
      <div className="cb-stack" style={{ gap: 'var(--cb-s2)' }}>
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
    </>
  );
};
