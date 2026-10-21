import { useEffect, useState, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import type { TAvatarId } from '@/shared/game';
import { PixelButton, TeamArt } from '@/shared/Chrome';
import { takenAvatars, type TSetupState } from '../domain/machine';
import { PICKER_TEAMS } from '../domain/pickerTeams';

type TProps = {
  state: TSetupState;
  onSelect: (id: TAvatarId) => void;
  onNext: () => void;
};

/** The title is the localized pick line after its "Duo n :" head (the chip shows the head). */
function pickTitle(full: string): string {
  const idx = full.indexOf(':');
  return idx === -1 ? full : full.slice(idx + 1).trim();
}

/**
 * Step A — TEAM PICK. All teams on one page: a 3×2 grid of team tiles (art or placeholder initial,
 * name in Inter underneath). Tapping a free tile SELECTS it (no auto-advance);
 * taken tiles are disabled; the pinned "Suivant" advances.
 */
export const TeamPick: FC<TProps> = ({ state, onSelect, onNext }) => {
  const t = useT();
  const sound = useSoundApi();
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
    <>
      <h1 className="cb-title cb-cap cb-v-setup__title--sm">
        {pickTitle(t('setup.team.pick', { n: state.coupleIdx + 1 }))}
      </h1>

      <div className="cb-teams cb-v-setup__teams">
        {PICKER_TEAMS.map((id) => {
          const isTaken = taken.has(id);
          const isSelected = state.avatar === id;
          const name = t(`team.${id}` as TStringKey);
          return (
            <button
              key={id}
              type="button"
              className="cb-team"
              onClick={handleTap(id)}
              aria-label={id}
              aria-pressed={isSelected}
              disabled={isTaken}
            >
              <TeamArt teamId={id} label={name} variant="tile" />
              <span className="cb-team-name">{name}</span>
            </button>
          );
        })}
      </div>

      {toast && (
        <div className="cb-toast cb-toast--error cb-v-setup__toast" role="status">
          {t('setup.team.taken')}
        </div>
      )}

      <PixelButton onClick={onNext} disabled={state.avatar === null}>
        {t('common.next')}
      </PixelButton>
    </>
  );
};
