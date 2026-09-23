import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots, modeIconSmall } from '@/shared/Chrome';
import { dilemmaQuestion, dilemmaTotal, questionText, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'question' }>;
  onReady: () => void;
};

/** V-DilemmaQuestion: the shared "Qui de vous deux…?" prompt before the countdown. */
export const DilemmaQuestion: FC<TProps> = ({ state, onReady }) => {
  const t = useT();
  const sound = useSoundApi();
  const question = dilemmaQuestion(state);
  const total = dilemmaTotal(state.mode, state.deck.length);

  useEffect(() => {
    sound.play('sfx.whoosh');
  }, [sound, state.questionIdx]);

  return (
    <>
      <div className="cb-topbar">
        <Chip icon={modeIconSmall('dilemma')}>{t('mode.dilemma.name')}</Chip>
        <ProgressDots total={total} current={state.questionIdx} />
      </div>

      <PixelPanel>
        <p className="cb-question">{questionText(question, 'you') || '—'}</p>
      </PixelPanel>

      <div className="cb-grow" />
      <p className="cb-muted cb-center" style={{ margin: 0 }}>
        {t('dilemma.rule')}
      </p>
      <PixelButton onClick={onReady}>{t('dilemma.ready')}</PixelButton>
    </>
  );
};
