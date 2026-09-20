import { useEffect, useState, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { AVATAR_IDS, type TAvatarId } from '@/shared/game';
import { PixelButton, Sprite } from '@/shared/Chrome';
import { takenAvatars, type TSetupState } from '../domain/machine';

type TProps = {
  state: TSetupState;
  onSelect: (id: TAvatarId) => void;
  onNext: () => void;
};

/**
 * Step A — TEAM PICK. The avatar grid is the hero: big tiles (2–3 cols, each
 * avatar ≥ 25% of viewport width), team name underneath. Tapping a free tile
 * SELECTS it (no auto-advance); the pinned "Suivant" advances.
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
      <h1 className="cb-title" style={{ margin: 0 }}>
        {t('setup.team.pick', { n: state.coupleIdx + 1 })}
      </h1>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          // 2–3 columns max; each tile keeps the avatar ≥ 25% of viewport width.
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(28vw, 140px), 1fr))',
          gap: 'var(--cb-s3)',
          alignContent: 'start',
          padding: 'var(--cb-s1)',
        }}
      >
        {AVATAR_IDS.map((id) => {
          const isTaken = taken.has(id);
          const isSelected = state.avatar === id;
          return (
            <PixelButton
              key={id}
              variant={isSelected ? 'gold' : 'ghost'}
              onClick={handleTap(id)}
              aria-label={id}
              aria-pressed={isSelected}
              disabled={isTaken}
              style={{
                display: 'grid',
                justifyItems: 'center',
                gap: 'var(--cb-s1)',
                padding: 'var(--cb-s2)',
                position: 'relative',
              }}
            >
              <Sprite
                name={`avatar-${id}`}
                {...(isSelected ? { className: 'cb-anim-bounce' } : {})}
                style={{
                  width: 'min(25vw, 120px)',
                  height: 'min(25vw, 120px)',
                  ...(isTaken ? { filter: 'grayscale(1)', opacity: 0.5 } : {}),
                }}
              />
              <span style={{ fontSize: 'var(--cb-fs-small)' }}>
                {t(`team.${id}` as TStringKey)}
              </span>
              {isTaken && (
                <Sprite name="ui-lock" size={16} style={{ position: 'absolute', top: 6, right: 6 }} />
              )}
            </PixelButton>
          );
        })}
      </div>

      {toast && (
        <p style={{ margin: 0, color: 'var(--cb-red)', fontSize: 'var(--cb-fs-small)', textAlign: 'center' }}>
          {t('setup.team.taken')}
        </p>
      )}

      <PixelButton
        variant="gold"
        block
        onClick={onNext}
        disabled={state.avatar === null}
        style={{ fontSize: 'var(--cb-fs-title)' }}
      >
        {t('common.next')}
      </PixelButton>
    </>
  );
};
