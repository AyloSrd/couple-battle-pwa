import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Sprite, ProgressDots } from '@/shared/Chrome';
import { flashQuestion, flashSetSize, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'guess' }>;
  guesserName: string;
  partnerName: string;
  onReveal: () => void;
  onAutoGuess: (guess: string) => void;
};

/** V-GuessReveal — the guesser answers out loud; open questions reveal a card,
 *  yes/no are auto-judged on the guesser's pick. */
export const GuessReveal: FC<TProps> = ({ state, guesserName, partnerName, onReveal, onAutoGuess }) => {
  const t = useT();
  const question = flashQuestion(state);
  const isYesNo = question?.type === 'yes_no';

  const handleYes = () => onAutoGuess(t('common.yes'));
  const handleNo = () => onAutoGuess(t('common.no'));

  return (
    <div style={{ flex: 1, display: 'grid', gap: 'var(--cb-s4)', alignContent: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ProgressDots total={flashSetSize(state.mode)} current={state.questionIdx} />
      </div>
      <p className="cb-heading" style={{ textAlign: 'center', margin: 0 }}>
        {t('guess.turn', { name: guesserName, partner: partnerName })}
      </p>

      <PixelPanel style={{ textAlign: 'center' }}>
        <p className="cb-question" style={{ margin: 0 }}>
          {question?.text ?? '—'}
        </p>
      </PixelPanel>

      {isYesNo ? (
        <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
          <PixelButton variant="positive" block onClick={handleYes}>
            {t('common.yes')}
          </PixelButton>
          <PixelButton variant="negative" block onClick={handleNo}>
            {t('common.no')}
          </PixelButton>
        </div>
      ) : (
        <>
          <p className="cb-muted" style={{ textAlign: 'center', margin: 0, fontSize: 'var(--cb-fs-small)' }}>
            {t('guess.outloud')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Sprite name="card-back" width={96} height={128} />
          </div>
          <PixelButton variant="gold" block onClick={onReveal} style={{ fontSize: 'var(--cb-fs-heading)' }}>
            {t('guess.reveal')}
          </PixelButton>
        </>
      )}
    </div>
  );
};
