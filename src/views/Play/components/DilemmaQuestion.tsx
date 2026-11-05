import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots, ModeIcon, modeIconSmall } from '@/shared/Chrome';
import type { TQuestion } from '@/shared/questions';
import { questionText, segmentLength, type TGameAt } from '../domain/machine';
import '../dilemma.css';

type TProps = {
  game: TGameAt<'ask'>;
  /** The card's text in the active language (undefined past a short deck). */
  question: TQuestion | undefined;
  onReady: () => void;
};

/** V-DilemmaQuestion: the shared "Qui de vous deux…?" prompt before the countdown. */
export const DilemmaQuestion: FC<TProps> = ({ game, question, onReady }) => {
  const t = useT();
  const sound = useSoundApi();
  const total = segmentLength(game.ctx);
  const q = game.step.q;

  useEffect(() => {
    sound.play('sfx.whoosh');
  }, [sound, q]);

  return (
    <div className="cb-v-dilemma cb-v-dilemma--question">
      <div className="cb-topbar">
        <Chip icon={modeIconSmall('dilemma')}>{t('mode.dilemma.name')}</Chip>
        <ProgressDots total={total} current={q} />
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
