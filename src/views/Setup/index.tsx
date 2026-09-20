import { useEffect, useReducer, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { type TAvatarId, type TRoster } from '@/shared/game';
import { Screen, PixelButton } from '@/shared/Chrome';
import { initSetup, reduceSetup } from './domain/machine';
import { TeamPick } from './components/TeamPick';
import { NameEntry } from './components/NameEntry';
import { SetupPass } from './components/SetupPass';

const COUNTS = [1, 2, 3, 4] as const;

/**
 * V-Setup — the roster-building wizard. One route, one view; a pure sub-machine
 * (domain/machine) drives the steps: count → per couple [TEAM → NAMES → (PASS
 * between couples)] → mode select. Back moves one step and never loses another
 * couple's entry.
 */
export const SetupView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();
  const { setRoster } = useDraftGame();

  const [state, dispatch] = useReducer(reduceSetup, undefined, initSetup);

  // Final couple locked in → seed the draft roster and head to mode select.
  useEffect(() => {
    if (state.step === 'done') {
      setRoster(state.teams as TRoster);
      navigate({ to: '/mode' });
    }
  }, [state.step, state.teams, setRoster, navigate]);

  const handleBack = () => {
    sound.play('sfx.back');
    if (state.step === 'count') {
      navigate({ to: '/' });
      return;
    }
    dispatch({ type: 'back' });
  };

  const handlePickCount = (n: number) => () => {
    sound.play('sfx.select');
    dispatch({ type: 'pickCount', count: n });
  };
  const handleSelectAvatar = (id: TAvatarId) => dispatch({ type: 'selectAvatar', avatarId: id });
  const handleTeamNext = () => {
    sound.play('sfx.select');
    dispatch({ type: 'confirmTeam' });
  };
  const handleChangeName = (which: 1 | 2, value: string) => dispatch({ type: 'setName', which, value });
  const handleNamesConfirm = () => {
    // Pure preview so the sound matches the outcome (advance vs. validation error).
    const next = reduceSetup(state, { type: 'confirmNames' });
    sound.play(next.error ? 'sfx.error' : 'sfx.select');
    dispatch({ type: 'confirmNames' });
  };
  const handlePassConfirm = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'confirmPass' });
  };

  if (state.step === 'done') return null;

  return (
    <Screen>
      <PixelButton variant="ghost" onClick={handleBack} style={{ alignSelf: 'flex-start' }}>
        ← {t('common.back')}
      </PixelButton>

      {state.step === 'count' && (
        <>
          <h1 className="cb-title">{t('setup.title')}</h1>
          <p className="cb-heading">{t('setup.couples.count')}</p>
          <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
            {COUNTS.map((n) => (
              <PixelButton key={n} variant="primary" block onClick={handlePickCount(n)}>
                {n}
              </PixelButton>
            ))}
          </div>
          <p className="cb-muted" style={{ margin: 0, fontSize: 'var(--cb-fs-small)' }}>
            {t('setup.couples.solo.hint')}
          </p>
        </>
      )}

      {state.step === 'team' && (
        <TeamPick state={state} onSelect={handleSelectAvatar} onNext={handleTeamNext} />
      )}

      {state.step === 'names' && (
        <NameEntry state={state} onChangeName={handleChangeName} onConfirm={handleNamesConfirm} />
      )}

      {state.step === 'pass' && (
        <SetupPass nextCoupleNumber={state.coupleIdx + 1} onConfirm={handlePassConfirm} />
      )}
    </Screen>
  );
};
