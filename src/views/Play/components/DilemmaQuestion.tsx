import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots, ModeIcon, modeIconSmall } from '@/shared/Chrome';
import { dilemmaQuestion, dilemmaTotal, questionText, type TGameState } from '../domain/machine';
import '../dilemma.css';

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
    <div className="cb-v-dilemma cb-v-dilemma--question">
      <div className="cb-topbar">
        <Chip icon={modeIconSmall('dilemma')}>{t('mode.dilemma.name')}</Chip>
        <ProgressDots total={total} current={state.questionIdx} />
      </div>

      <PixelPanel className="cb-v-card">
        <ModeIcon mode="dilemma" size={88} className="cb-v-mode-icon" />
        <p className="cb-question">{questionText(question, 'you') || '—'}</p>
      </PixelPanel>

      <p className="cb-v-rule">{t('dilemma.rule')}</p>
      <PixelButton className="cb-v-cta" onClick={onReady}>
        {t('dilemma.ready')}
      </PixelButton>
    </div>
  );
};
