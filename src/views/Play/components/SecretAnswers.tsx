import { useState, type ChangeEvent, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Chip, ProgressDots, AnswerButton, Field } from '@/shared/Chrome';
import { ActorBadge } from './ActorBadge';
import '../flash.css';
import { normalizeText, SECRET_MAX } from '@/shared/game';
import type { TQuestion } from '@/shared/questions';
import type { TDispatch } from '../application/game';
import { cardOf, questionText, segmentLength, teamOf, type TGameAt } from '../domain/machine';

type TProps = {
  game: TGameAt<'secret'>;
  question: TQuestion | undefined;
  dispatch: TDispatch;
};

/** V-SecretAnswers — the answerer privately answers, then locks: typed text, or a closed
 *  token ('yes' | 'no', 'p0' | 'p1'). No going back. Mounted with a key per slot. */
export const SecretAnswers: FC<TProps> = ({ game, question, dispatch }) => {
  const t = useT();
  const [text, setText] = useState('');
  const type = cardOf(game)?.type;
  const isYesNo = type === 'yes_no';
  // who_of_two answers are one of the couple's two names (roster order), locked as p0 | p1.
  const twoNames = type === 'who_of_two' ? teamOf(game)?.players : undefined;

  // What the machine will store (it normalises again): blank or invisible-only text can't lock.
  const typed = normalizeText(text, SECRET_MAX);

  const lock = (value: string) => dispatch({ type: 'answer', value });
  const handleSubmitText = () => {
    if (typed) lock(typed);
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
          <AnswerButton label={twoNames[0]} tone="p1" sfx="sfx.lock" onClick={handleFirst} />
          <AnswerButton label={twoNames[1]} tone="p2" sfx="sfx.lock" onClick={handleSecond} />
        </div>
      ) : isYesNo ? (
        <div className="cb-answers">
          <AnswerButton label={t('common.yes')} tone="p1" sfx="sfx.lock" onClick={handleYes} />
          <AnswerButton label={t('common.no')} tone="p2" sfx="sfx.lock" onClick={handleNo} />
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
          <PixelButton size="lg" sfx="sfx.lock" onClick={handleSubmitText} disabled={!typed}>
            {t('secret.submit')}
          </PixelButton>
        </>
      )}
    </div>
  );
};
