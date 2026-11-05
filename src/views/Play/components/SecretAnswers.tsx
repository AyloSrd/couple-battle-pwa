import { useState, type ChangeEvent, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Chip, ProgressDots, Field } from '@/shared/Chrome';
import { normalizeText, SECRET_MAX } from '@/shared/game';
import type { TScreenProps } from '../application/game';
import { questionText, segmentLength } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import { closedChoices } from './answerLabel';
import { ClosedAnswers } from './ClosedAnswers';
import '../flash.css';

/** V-SecretAnswers — the answerer answers privately and locks; no way back. Keyed per slot. */
export const SecretAnswers: FC<TScreenProps<'secret'>> = ({ game, question, dispatch }) => {
  const t = useT();
  const [text, setText] = useState('');
  const choices = closedChoices(game, t);
  // What the machine will store (it normalises again): blank or invisible-only text can't lock.
  const typed = normalizeText(text, SECRET_MAX);
  const handleLock = (value: string) => dispatch({ type: 'answer', value });
  const handleSubmitText = () => {
    if (typed) handleLock(typed);
  };
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value);

  return (
    <div className="cb-v-flash cb-v-flash--secret">
      {/* the questions are shared within the answerers' side; only the OTHER side must not look */}
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.answerers')}</Chip>
        <ProgressDots total={segmentLength(game.ctx)} current={game.step.q} />
      </div>
      <PixelPanel className="cb-flash-card cb-flash-card--player">
        <ActorBadge game={game} variant="card" />
        <p className="cb-question">{questionText(question, 'you') || '—'}</p>
      </PixelPanel>
      {choices ? (
        <ClosedAnswers choices={choices} sfx="sfx.lock" onPick={handleLock} />
      ) : (
        <>
          <Field
            placeholder={t('secret.placeholder')}
            value={text}
            onChange={handleChange}
            maxLength={SECRET_MAX}
            autoCapitalize="off"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <PixelButton size="lg" sfx="sfx.lock" onClick={handleSubmitText} disabled={!typed}>
            {t('secret.submit')}
          </PixelButton>
        </>
      )}
    </div>
  );
};
