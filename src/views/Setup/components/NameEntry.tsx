import { useRef, type FC, type KeyboardEvent } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, Field, TeamArt } from '@/shared/Chrome';
import { isLastCouple, type TSetupState, type TSetupError } from '../domain/machine';

type TProps = {
  state: TSetupState;
  onChangeName: (which: 1 | 2, value: string) => void;
  onConfirm: () => void;
};

const ERROR_KEY: Record<Exclude<TSetupError, null>, TStringKey> = {
  required: 'setup.names.required',
  duplicate: 'setup.names.duplicate',
};

/** Step B — NAMES. Chosen team small on top, two fields (autofocus first;
 *  Enter jumps to the second; Enter again submits). */
export const NameEntry: FC<TProps> = ({ state, onChangeName, onConfirm }) => {
  const t = useT();
  const secondRef = useRef<HTMLInputElement>(null);
  const teamName = state.avatar ? t(`team.${state.avatar}` as TStringKey) : '';

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
      <div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--cb-s3)' }}>
        {state.avatar && <TeamArt teamId={state.avatar} label={teamName} variant="avatarLg" />}
        <h1 className="cb-title cb-center">{t('setup.names.title', { team: teamName })}</h1>
      </div>

      <PixelPanel className="cb-stack">
        <Field
          placeholder={t('setup.names.p1')}
          value={state.name1}
          onChange={(e) => onChangeName(1, e.target.value)}
          onKeyDown={handleKey1}
          aria-invalid={state.error === 'required' && !state.name1.trim() ? true : undefined}
          autoFocus
          maxLength={16}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <Field
          ref={secondRef}
          placeholder={t('setup.names.p2')}
          value={state.name2}
          onChange={(e) => onChangeName(2, e.target.value)}
          onKeyDown={handleKey2}
          aria-invalid={state.error !== null ? true : undefined}
          maxLength={16}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {state.error && <p className="cb-field-error">{t(ERROR_KEY[state.error])}</p>}
      </PixelPanel>

      <div className="cb-grow" />
      <PixelButton onClick={onConfirm}>{isLastCouple(state) ? t('setup.ready') : t('common.next')}</PixelButton>
    </>
  );
};
