import { useState, type ChangeEvent, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Chip, ProgressDots, AnswerButton, Field } from '@/shared/Chrome';
import { ActorBadge } from './ActorBadge';
import '../flash.css';
import { flashQuestion, flashSetSize, questionText, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'secretInput' }>;
  onLock: (answer: string) => void;
};

/** V-SecretAnswers — the answerer privately answers, then locks. No going back. */
export const SecretAnswers: FC<TProps> = ({ state, onLock }) => {
  const t = useT();
  const [text, setText] = useState('');
  const question = flashQuestion(state);
  const isYesNo = question?.type === 'yes_no';
  // who_of_two answers are one of the couple's two names (roster order).
  const twoNames = question?.type === 'who_of_two' ? state.roster[state.coupleIdx]?.players : undefined;

  const lock = (answer: string) => {
    setText('');
    onLock(answer);
  };
  const handleSubmitText = () => {
    if (text.trim()) lock(text.trim());
  };
  const handleYes = () => lock(t('common.yes'));
  const handleNo = () => lock(t('common.no'));
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value);

  return (
    <div className="cb-v-flash cb-v-flash--secret">
      {/* "Answerers' side" chip — the questions are shared within this group;
          only the OTHER side must not look. */}
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.answerers')}</Chip>
        <ProgressDots total={flashSetSize(state.mode)} current={state.questionIdx} />
      </div>

      <PixelPanel className="cb-flash-card cb-flash-card--player">
        <ActorBadge state={state} variant="card" />
        <p className="cb-question">{questionText(question, 'you') || '—'}</p>
      </PixelPanel>

      {twoNames ? (
        <div className="cb-answers">
          <AnswerButton label={twoNames[0]} tone="p1" onClick={() => lock(twoNames[0])} />
          <AnswerButton label={twoNames[1]} tone="p2" onClick={() => lock(twoNames[1])} />
        </div>
      ) : isYesNo ? (
        <div className="cb-answers">
          <AnswerButton label={t('common.yes')} tone="p1" onClick={handleYes} />
          <AnswerButton label={t('common.no')} tone="p2" onClick={handleNo} />
        </div>
      ) : (
        <>
          <Field
            placeholder={t('secret.placeholder')}
            value={text}
            onChange={handleChange}
            maxLength={40}
            autoCapitalize="off"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <PixelButton onClick={handleSubmitText} disabled={!text.trim()}>
            {t('secret.submit')}
          </PixelButton>
        </>
      )}
    </div>
  );
};
