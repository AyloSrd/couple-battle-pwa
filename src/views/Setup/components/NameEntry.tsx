import { useRef, type CSSProperties, type FC, type KeyboardEvent } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import { isLastCouple, type TSetupState, type TSetupError } from '../domain/machine';

type TProps = {
  state: TSetupState;
  onChangeName: (which: 1 | 2, value: string) => void;
  onConfirm: () => void;
};

const inputStyle: CSSProperties = {
  fontFamily: 'var(--cb-font-body)',
  fontSize: 'var(--cb-fs-body)',
  padding: 'var(--cb-s2) var(--cb-s3)',
  border: 'var(--cb-border)',
  background: 'var(--cb-white)',
  width: '100%',
  boxSizing: 'border-box',
};

const ERROR_KEY: Record<Exclude<TSetupError, null>, TStringKey> = {
  required: 'setup.names.required',
  duplicate: 'setup.names.duplicate',
};

/** Step B — NAMES. Header with the chosen avatar small on top, two inputs
 *  (autofocus first; Enter jumps to the second; Enter again submits). */
export const NameEntry: FC<TProps> = ({ state, onChangeName, onConfirm }) => {
  const t = useT();
  const secondRef = useRef<HTMLInputElement>(null);

  const handleKey1 = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      secondRef.current?.focus();
    }
  };
  const handleKey2 = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--cb-s2)' }}>
        {state.avatar && <Sprite name={`avatar-${state.avatar}`} size={48} />}
        <h1 className="cb-title" style={{ margin: 0, textAlign: 'center' }}>
          {t('setup.names.title', {
            team: state.avatar ? t(`team.${state.avatar}` as TStringKey) : '',
          })}
        </h1>
      </div>

      <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s3)' }}>
        <input
          style={inputStyle}
          placeholder={t('setup.names.p1')}
          value={state.name1}
          onChange={(e) => onChangeName(1, e.target.value)}
          onKeyDown={handleKey1}
          autoFocus
          maxLength={16}
        />
        <input
          ref={secondRef}
          style={inputStyle}
          placeholder={t('setup.names.p2')}
          value={state.name2}
          onChange={(e) => onChangeName(2, e.target.value)}
          onKeyDown={handleKey2}
          maxLength={16}
        />
      </PixelPanel>

      {state.error && (
        <p style={{ margin: 0, color: 'var(--cb-red)', fontSize: 'var(--cb-fs-small)' }}>
          {t(ERROR_KEY[state.error])}
        </p>
      )}

      <PixelButton variant="gold" block onClick={onConfirm} style={{ fontSize: 'var(--cb-fs-title)' }}>
        {isLastCouple(state) ? t('setup.ready') : t('common.next')}
      </PixelButton>
    </>
  );
};
