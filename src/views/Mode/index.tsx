import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { Mode, type TMode } from '@/shared/game';
import { Screen, PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';

type TModeCardDef = {
  mode: TMode;
  nameKey: TStringKey;
  durKey: TStringKey;
  descKey: TStringKey;
  sprite: string;
};

const CARDS: TModeCardDef[] = [
  { mode: Mode.Flash, nameKey: 'mode.flash.name', durKey: 'mode.flash.dur', descKey: 'mode.flash.desc', sprite: 'mode-flash' },
  { mode: Mode.Dilemma, nameKey: 'mode.dilemma.name', durKey: 'mode.dilemma.dur', descKey: 'mode.dilemma.desc', sprite: 'mode-dilemma' },
  { mode: Mode.Ultime, nameKey: 'mode.ultime.name', durKey: 'mode.ultime.dur', descKey: 'mode.ultime.desc', sprite: 'ui-crown' },
];

const ModeCard: FC<{ def: TModeCardDef; onPick: (mode: TMode) => void }> = ({ def, onPick }) => {
  const t = useT();
  const handlePick = () => onPick(def.mode);
  return (
    <PixelPanel
      onClick={handlePick}
      role="button"
      tabIndex={0}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--cb-s3)', cursor: 'pointer' }}
    >
      <Sprite name={def.sprite} size={32} />
      <div style={{ display: 'grid', gap: 'var(--cb-s1)', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--cb-s2)' }}>
          <strong className="cb-heading">{t(def.nameKey)}</strong>
          <span className="cb-muted" style={{ fontSize: 'var(--cb-fs-small)' }}>
            {t(def.durKey)}
          </span>
        </div>
        <span style={{ fontSize: 'var(--cb-fs-small)' }}>{t(def.descKey)}</span>
      </div>
    </PixelPanel>
  );
};

export const ModeView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();
  const { setMode } = useDraftGame();

  const handleBack = () => {
    sound.play('sfx.back');
    navigate({ to: '/setup' });
  };

  const handlePick = (mode: TMode) => {
    sound.play('sfx.select');
    setMode(mode);
    navigate({ to: '/difficulty' });
  };

  return (
    <Screen>
      <PixelButton variant="ghost" onClick={handleBack}>
        ← {t('common.back')}
      </PixelButton>
      <h1 className="cb-title">{t('mode.title')}</h1>
      {CARDS.map((def) => (
        <ModeCard key={def.mode} def={def} onPick={handlePick} />
      ))}
    </Screen>
  );
};
