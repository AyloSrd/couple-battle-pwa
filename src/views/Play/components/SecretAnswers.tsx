import { useState, type ChangeEvent, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Chip, ProgressDots, AnswerButton, Field } from '@/shared/Chrome';
import { ActorBadge } from './ActorBadge';
import '../flash.css';
import { SECRET_MAX } from '@/shared/game';
import type { TQuestion } from '@/shared/questions';
import { cardOf, questionText, segmentLength, teamOf, type TGameAt } from '../domain/machine';

type TProps = {
  game: TGameAt<'secret'>;
  question: TQuestion | undefined;
  /** Locks the answer: typed text, or a closed token ('yes' | 'no', 'p0' | 'p1'). */
  onLock: (answer: string) => void;
};

/** V-SecretAnswers — the answerer privately answers, then locks. No going back. */
export const SecretAnswers: FC<TProps> = ({ game, question, onLock }) => {
  const t = useT();
  const [text, setText] = useState('');
  const type = cardOf(game)?.type;
  const isYesNo = type === 'yes_no';
  // who_of_two answers are one of the couple's two names (roster order), locked as p0 | p1.
  const twoNames = type === 'who_of_two' ? teamOf(game)?.players : undefined;

  const lock = (answer: string) => {
    setText('');
    onLock(answer);
  };
  const handleSubmitText = () => {
    if (text.trim()) lock(text.trim());
  };
  const handleYes = () => lock('yes');
  const handleNo = () => lock('no');
  const handleFirst = () => lock('p0');
  const handleSecond = () => lock('p1');
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value);

  return (
    <div className="cb-v-flash cb-v-flash--secret">
      {/* "Answerers' side" chip — the questions are shared within this group;
          only the OTHER side must not look. */}
      <div className="cb-topbar">
        <Chip>{t('flash.side.chip.answerers')}</Chip>
        <ProgressDots total={segmentLength(game.ctx)} current={game.step.q} />
      </div>

      <PixelPanel className="cb-flash-card cb-flash-card--player">
        <ActorBadge game={game} variant="card" />
        <p className="cb-question">{questionText(question, 'you') || '—'}</p>
      </PixelPanel>

      {twoNames ? (
        <div className="cb-answers">
          <AnswerButton label={twoNames[0]} tone="p1" onClick={handleFirst} />
          <AnswerButton label={twoNames[1]} tone="p2" onClick={handleSecond} />
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
            maxLength={SECRET_MAX}
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
