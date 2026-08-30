import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import type { TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'question' }>;
  onReady: () => void;
};

/** V-DilemmaQuestion: the shared "Qui de vous deux…?" prompt before the countdown. */
export const DilemmaQuestion: FC<TProps> = ({ state, onReady }) => {
  const t = useT();
  const sound = useSoundApi();
  const question = state.deck[state.questionIdx];

  useEffect(() => {
    sound.play('sfx.whoosh');
  }, [sound, state.questionIdx]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--cb-s2)' }}>
        <Sprite name="mode-dilemma" size={20} />
        <span className="cb-muted" style={{ fontSize: 'var(--cb-fs-small)' }}>
          {t('common.question', { n: state.questionIdx + 1, total: state.deck.length })}
        </span>
      </div>

      <PixelPanel style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <p className="cb-question" style={{ margin: 0 }}>
          {question?.text ?? '—'}
        </p>
      </PixelPanel>

      <p className="cb-muted" style={{ textAlign: 'center', margin: 0, fontSize: 'var(--cb-fs-small)' }}>
        {t('dilemma.rule')}
      </p>

      <PixelButton variant="gold" block onClick={onReady} style={{ fontSize: 'var(--cb-fs-title)' }}>
        {t('dilemma.ready')}
      </PixelButton>
    </>
  );
};
