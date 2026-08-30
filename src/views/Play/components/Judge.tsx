import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton } from '@/shared/Chrome';
import { flashQuestion, type TGameState, type TVerdict } from '../domain/machine';

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
  const answer = question ? state.secretAnswers[String(question.id)] : undefined;

  // The reveal / card-flip moment.
  useEffect(() => {
    sound.play('sfx.reveal');
  }, [sound]);

  const makeVerdict = (verdict: TVerdict) => () => onJudge(verdict);

  return (
    <div style={{ flex: 1, display: 'grid', gap: 'var(--cb-s4)', alignContent: 'start' }}>
      <p className="cb-muted" style={{ textAlign: 'center', margin: 0, fontSize: 'var(--cb-fs-small)' }}>
        {t('guess.answerWas', { name: answererName })}
      </p>

      {/* card-front reveal */}
      <PixelPanel
        style={{
          background: 'var(--cb-white)',
          textAlign: 'center',
          padding: 'var(--cb-s6) var(--cb-s4)',
          animation: 'var(--cb-pop)',
        }}
      >
        <p className="cb-question" style={{ margin: 0 }}>
          {answer ?? '—'}
        </p>
      </PixelPanel>

      <h2 className="cb-heading" style={{ textAlign: 'center', margin: 0 }}>
        {t('judge.title')}
      </h2>

      <div style={{ display: 'grid', gap: 'var(--cb-s2)' }}>
        <PixelButton variant="positive" block onClick={makeVerdict('exact')}>
          {t('judge.exact')}
        </PixelButton>
        <PixelButton variant="gold" block onClick={makeVerdict('close')}>
          {t('judge.close')}
        </PixelButton>
        <PixelButton variant="negative" block onClick={makeVerdict('miss')}>
          {t('judge.miss')}
        </PixelButton>
      </div>
    </div>
  );
};
