import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { useDraft } from '@/shared/session';
import { Mode, type TMode } from '@/shared/game';
import { Screen, ProgressDots, ModeIcon, TopBar } from '@/shared/Chrome';
import './view.css';

const modeKey = (mode: TMode, part: 'name' | 'dur' | 'desc'): TStringKey => `mode.${mode}.${part}`;

const ModeCard: FC<{ mode: TMode; onPick: (mode: TMode) => void }> = ({ mode, onPick }) => {
  const t = useT();
  const handlePick = () => onPick(mode);
  return (
    <button type="button" className="cb-mode" onClick={handlePick}>
      <ModeIcon mode={mode} size={96} />
      <div>
        <h3>{t(modeKey(mode, 'name'))}</h3>
        <p>{t(modeKey(mode, 'desc'))}</p>
      </div>
      <span className="cb-dur">{t(modeKey(mode, 'dur'))}</span>
    </button>
  );
};

export const ModeView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSound();
  const { draftStore } = useDraft();

  const handlePick = (mode: TMode) => {
    sound.play('sfx.select');
    draftStore.set({ mode });
    navigate({ to: '/difficulty' });
  };

  return (
    <Screen className="cb-v-mode">
      <TopBar back="/setup">
        <ProgressDots total={3} current={1} />
      </TopBar>
      <h1 className="cb-title">{t('mode.title')}</h1>
      <div className="cb-modes">
        {Object.values(Mode).map((mode) => (
          <ModeCard key={mode} mode={mode} onPick={handlePick} />
        ))}
      </div>
    </Screen>
  );
};
