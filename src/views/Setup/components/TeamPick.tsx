import { useEffect, useState, type FC } from 'react';
import { teamKey, useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import type { TAvatarId } from '@/shared/game';
import { PixelButton, TeamArt } from '@/shared/Chrome';
import { takenAvatars, type TSetupState } from '../domain/machine';
import { PICKER_TEAMS } from '../domain/pickerTeams';
import { pickTitle } from '../domain/labels';

type TProps = {
  state: TSetupState;
  onSelect: (id: TAvatarId) => void;
  onNext: () => void;
};

/** Step A — TEAM PICK: a 3×2 grid of team tiles on one page. A tap SELECTS a free tile (no
 *  auto-advance); taken tiles are disabled; "Suivant" advances. */
export const TeamPick: FC<TProps> = ({ state, onSelect, onNext }) => {
  const t = useT();
  const sound = useSound();
  const taken = takenAvatars(state);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), 1600);
    return () => clearTimeout(id);
  }, [toast]);

  const handleTap = (id: TAvatarId) => () => {
    if (taken.has(id)) {
      sound.play('sfx.error');
      setToast(true);
      return;
    }
    sound.play('sfx.select');
    onSelect(id);
  };

  return (
    <div className="cb-v-setup__team-block">
      <h1 className="cb-title cb-cap cb-v-setup__title--sm">
        {pickTitle(t('setup.team.pick', { n: state.coupleIdx + 1 }))}
      </h1>

      <div className="cb-v-setup__teams">
        {PICKER_TEAMS.map((id) => {
          const name = t(teamKey(id));
          return (
            <button key={id} type="button" className="cb-team" onClick={handleTap(id)} aria-label={id} aria-pressed={state.avatar === id} disabled={taken.has(id)}>
              <TeamArt teamId={id} label={name} variant="tile" />
              <span className="cb-team-name">{name}</span>
            </button>
          );
        })}
      </div>

      {toast && <div className="cb-toast cb-toast--error cb-v-setup__toast" role="status">{t('setup.team.taken')}</div>}

      <PixelButton sfx="sfx.select" onClick={onNext} disabled={state.avatar === null}>{t('common.next')}</PixelButton>
    </div>
  );
};
