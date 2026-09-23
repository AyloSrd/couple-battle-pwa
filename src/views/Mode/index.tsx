import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { Mode, type TMode } from '@/shared/game';
import { Screen, PixelButton, ProgressDots, ModeIcon } from '@/shared/Chrome';

type TModeCardDef = {
  mode: TMode;
  nameKey: TStringKey;
  durKey: TStringKey;
  descKey: TStringKey;
};

const CARDS: TModeCardDef[] = [
  { mode: Mode.Flash, nameKey: 'mode.flash.name', durKey: 'mode.flash.dur', descKey: 'mode.flash.desc' },
  { mode: Mode.Dilemma, nameKey: 'mode.dilemma.name', durKey: 'mode.dilemma.dur', descKey: 'mode.dilemma.desc' },
  { mode: Mode.Ultime, nameKey: 'mode.ultime.name', durKey: 'mode.ultime.dur', descKey: 'mode.ultime.desc' },
];

const ModeCard: FC<{ def: TModeCardDef; onPick: (mode: TMode) => void }> = ({ def, onPick }) => {
  const t = useT();
  const handlePick = () => onPick(def.mode);
  return (
    <button type="button" className="cb-mode" onClick={handlePick}>
      <ModeIcon mode={def.mode} size={64} />
      <div>
        <h3>{t(def.nameKey)}</h3>
        <p>{t(def.descKey)}</p>
      </div>
      <span className="cb-dur">{t(def.durKey)}</span>
    </button>
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
      <div className="cb-topbar">
        <PixelButton variant="ghost" block={false} onClick={handleBack}>
          ← {t('common.back')}
        </PixelButton>
        <ProgressDots total={3} current={1} />
      </div>
      <h1 className="cb-title" style={{ marginBottom: 'var(--cb-s2)' }}>
        {t('mode.title')}
      </h1>
      <div className="cb-stack">
        {CARDS.map((def) => (
          <ModeCard key={def.mode} def={def} onPick={handlePick} />
        ))}
      </div>
    </Screen>
  );
};
