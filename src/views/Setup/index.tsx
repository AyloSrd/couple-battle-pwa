import { useReducer, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { type TAvatarId, type TRoster } from '@/shared/game';
import { Screen, PixelButton, PixelPanel, Chip, ProgressDots, BackButton, TeamArt } from '@/shared/Chrome';
import { initSetup, reduceSetup } from './domain/machine';
import { TeamPick } from './components/TeamPick';
import { NameEntry } from './components/NameEntry';
import { SetupPass } from './components/SetupPass';
import './view.css';

const COUNTS = [1, 2, 3, 4] as const;
/** The duo shown on the count screen (view-level choice — first team with full-body art). */
const COUNT_HERO = 'otters';

/** "Duo {n}" — the localized team-pick line up to its colon ("Duo 2 : choisissez…"). */
export function duoLabel(full: string): string {
  const head = full.split(':')[0]?.trim();
  return head && head !== full ? head : full;
}

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
    // Final couple locked in → seed the draft roster and head to mode select.
    if (next.step === 'done') {
      setRoster(next.teams as TRoster);
      navigate({ to: '/mode' });
    }
  };
  const handlePassConfirm = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'confirmPass' });
  };

  if (state.step === 'done') return null;

  const inWizard = state.step !== 'count';
  // Chip: which couple we're building (the pass interstitial already points at the next one).
  const chipCouple = state.coupleIdx + 1;

  return (
    <Screen className={['cb-v-setup', state.step === 'count' || state.step === 'team' ? 'cb-v-setup--fit' : ''].filter(Boolean).join(' ')}>
      <div className="cb-topbar">
        <BackButton label={t('common.back')} onClick={handleBack} />
        {inWizard && state.count !== null && (
          <span className="cb-v-setup__meta">
            <Chip>{duoLabel(t('setup.team.pick', { n: chipCouple }))}</Chip>
            <ProgressDots total={state.count} current={state.coupleIdx} />
          </span>
        )}
      </div>

      {state.step === 'count' && (
        <>
          <h1 className="cb-title">{t('setup.title')}</h1>
          <p className="cb-v-setup__lead">{t('setup.couples.count')}</p>
          <div className="cb-v-setup__counts">
            {COUNTS.map((n) => (
              <PixelButton key={n} variant="secondary" onClick={handlePickCount(n)}>
                {n}
              </PixelButton>
            ))}
          </div>
          <PixelPanel className="cb-v-setup__hint">{t('setup.couples.solo.hint')}</PixelPanel>
          <div className="cb-v-setup__hero">
            <TeamArt teamId={COUNT_HERO} label={t(`team.${COUNT_HERO}`)} variant="hero" />
          </div>
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
