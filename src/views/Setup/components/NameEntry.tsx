import { useRef, type ChangeEvent, type FC, type KeyboardEvent } from 'react';
import { teamKey, useT, type TStringKey } from '@/shared/i18n';
import { NAME_MAX } from '@/shared/game';
import { PixelPanel, PixelButton, Field, PlayerAvatar, TeamArt } from '@/shared/Chrome';
import { cleanName, isLastCouple, type TSetupState, type TSetupError } from '../domain/machine';

type TProps = {
  state: TSetupState;
  onChangeName: (which: 1 | 2, value: string) => void;
  onConfirm: () => void;
};

const ERROR_KEY = {
  required: 'setup.names.required',
  duplicate: 'setup.names.duplicate',
} as const satisfies Record<Exclude<TSetupError, null>, TStringKey>;

/** Step B — NAMES. Chosen team small on top, two fields (autofocus first;
 *  Enter jumps to the second; Enter again submits). */
export const NameEntry: FC<TProps> = ({ state, onChangeName, onConfirm }) => {
  const t = useT();
  const secondRef = useRef<HTMLInputElement>(null);
  const teamName = state.avatar ? t(teamKey(state.avatar)) : '';

  const handleName1 = (e: ChangeEvent<HTMLInputElement>) => onChangeName(1, e.target.value);
  const handleName2 = (e: ChangeEvent<HTMLInputElement>) => onChangeName(2, e.target.value);

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
      <h1 className="cb-title">{t('setup.names.title', { team: teamName })}</h1>

      <PixelPanel className="cb-stack cb-v-setup__form">
        <div className="cb-v-setup__player">
          {state.avatar && (
            <PlayerAvatar teamId={state.avatar} slot={1} name={state.name1} teamLabel={teamName} />
          )}
          <Field
            placeholder={t('setup.names.p1')}
            value={state.name1}
            onChange={handleName1}
            onKeyDown={handleKey1}
            aria-invalid={state.error === 'required' && !cleanName(state.name1) ? true : undefined}
            autoFocus
            maxLength={NAME_MAX}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div className="cb-v-setup__player">
          {state.avatar && (
            <PlayerAvatar teamId={state.avatar} slot={2} name={state.name2} teamLabel={teamName} />
          )}
          <Field
            ref={secondRef}
            placeholder={t('setup.names.p2')}
            value={state.name2}
            onChange={handleName2}
            onKeyDown={handleKey2}
            aria-invalid={state.error !== null ? true : undefined}
            maxLength={NAME_MAX}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        {state.error && <p className="cb-field-error">{t(ERROR_KEY[state.error])}</p>}
      </PixelPanel>

      <div className="cb-v-setup__hero">
        {state.avatar && <TeamArt teamId={state.avatar} label={teamName} variant="hero" />}
      </div>
      {/* The handler plays select or error (Enter submits too). */}
      <PixelButton sfx={null} onClick={onConfirm}>{isLastCouple(state) ? t('setup.ready') : t('common.next')}</PixelButton>
    </>
  );
};
