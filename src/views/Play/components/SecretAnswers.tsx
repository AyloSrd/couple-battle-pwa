import { useState, type ChangeEvent, type CSSProperties, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Sprite, ProgressDots } from '@/shared/Chrome';
import { flashQuestion, flashSetSize, questionText, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'secretInput' }>;
  onLock: (answer: string) => void;
};

const inputStyle: CSSProperties = {
  fontFamily: 'var(--cb-font-body)',
  fontSize: 'var(--cb-fs-body)',
  padding: 'var(--cb-s3)',
  border: 'var(--cb-border)',
  background: 'var(--cb-white)',
  width: '100%',
  boxSizing: 'border-box',
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
    <div style={{ flex: 1, display: 'grid', gap: 'var(--cb-s4)', alignContent: 'start' }}>
      {/* "Answerers' side" indicator — the questions are shared within this group,
          so no dimmed "secret" vignette; only the OTHER side must not look. */}
      <div
        className="cb-muted"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--cb-s2)',
          justifyContent: 'center',
          fontSize: 'var(--cb-fs-small)',
        }}
      >
        <Sprite name="ui-lock" size={14} />
        <span>{t('flash.side.answerers.title')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ProgressDots total={flashSetSize(state.mode)} current={state.questionIdx} />
      </div>

      <PixelPanel style={{ textAlign: 'center' }}>
        <p className="cb-question" style={{ margin: 0 }}>
          {questionText(question, 'you') || '—'}
        </p>
      </PixelPanel>

      {twoNames ? (
        <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
          <PixelButton variant="primary" block onClick={() => lock(twoNames[0])}>
            {twoNames[0]}
          </PixelButton>
          <PixelButton variant="primary" block onClick={() => lock(twoNames[1])}>
            {twoNames[1]}
          </PixelButton>
        </div>
      ) : isYesNo ? (
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
          <input
            style={inputStyle}
            placeholder={t('secret.placeholder')}
            value={text}
            onChange={handleChange}
            maxLength={40}
            autoCapitalize="off"
            autoFocus
          />
          <PixelButton variant="gold" block onClick={handleSubmitText} disabled={!text.trim()}>
            {t('secret.submit')}
          </PixelButton>
        </>
      )}
    </div>
  );
};
