import { useState, type ChangeEvent, type CSSProperties, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Sprite, ProgressDots } from '@/shared/Chrome';
import { flashQuestion, FLASH_SET, type TGameState } from '../domain/machine';

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
    <div
      style={{
        flex: 1,
        display: 'grid',
        gap: 'var(--cb-s4)',
        alignContent: 'start',
        // subtle "secret" vignette
        boxShadow: 'inset 0 0 60px rgba(26,28,44,0.25)',
        padding: 'var(--cb-s3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--cb-s2)', justifyContent: 'center' }}>
        <Sprite name="ui-lock" size={16} />
        <span className="cb-heading">{t('secret.title')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ProgressDots total={FLASH_SET} current={state.questionIdx} />
      </div>

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
