import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelPanel, PixelButton, Chip, ProgressDots, ModeIcon, modeIconSmall } from '@/shared/Chrome';
import type { TScreenProps } from '../application/game';
import { questionText, segmentLength } from '../domain/machine';
import '../dilemma.css';

type TProps = Omit<TScreenProps<'ask'>, 'dispatch'> & { onReady: () => void };

/** V-DilemmaQuestion: the shared "Qui de vous deux…?" prompt; READY starts Play's countdown. */
export const DilemmaQuestion: FC<TProps> = ({ game, question, onReady }) => {
  const t = useT();
  const sound = useSound();
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
      <PixelButton size="lg" className="cb-v-cta" onClick={onReady}>
        {t('dilemma.ready')}
      </PixelButton>
    </div>
  );
};
