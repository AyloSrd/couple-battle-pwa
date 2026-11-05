import { useEffect, useState, type FC, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { selectSettings, useSave, useSaveStore } from '@/shared/save';
import { useSound } from '@/shared/sound';
import { Screen, PixelPanel, PixelButton, Sheet, TopBar, LanguagePicker } from '@/shared/Chrome';
import './view.css';

/** `toggle` makes the row a `<label>` so a tap anywhere on it reaches the one switch inside
 *  (a label forwards its click to its button; a tap on the switch itself is not forwarded twice). */
const Row: FC<{ label: string; hint?: string; toggle?: boolean; children: ReactNode }> = ({ label, hint, toggle = false, children }) => {
  const body = (
    <>
      <div className="cb-v-row-text">
        <span className="cb-label">{label}</span>
        {hint && <span className="cb-muted">{hint}</span>}
      </div>
      <div className="cb-v-row-ctl">{children}</div>
    </>
  );
  return toggle ? (
    <label className="cb-card cb-v-row cb-v-row--toggle">{body}</label>
  ) : (
    <PixelPanel className="cb-v-row">{body}</PixelPanel>
  );
};

/** A big on/off switch. `label` names it for assistive tech (the row is a label around it, so the name is set explicitly). */
const Switch: FC<{ label: string; checked: boolean; onToggle: () => void }> = ({ label, checked, onToggle }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} className="cb-v-switch" onClick={onToggle}>
    <span className="cb-v-switch-thumb" aria-hidden="true" />
  </button>
);

const Chevron: FC = () => (
  <svg className="cb-v-chevron" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SettingsView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSound();
  const store = useSaveStore();
  const settings = useSave(selectSettings);

  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const handleToggleSound = () => {
    const next = !settings.sound;
    sound.setEnabled(next); // now, so the "on" toggle sound is heard (the shell follows the setting)
    sound.play(next ? 'sfx.toggle.on' : 'sfx.toggle.off');
    store.updateSettings({ sound: next });
  };

  const handleToggleVibration = () => {
    const next = !settings.vibration;
    sound.play(next ? 'sfx.toggle.on' : 'sfx.toggle.off');
    // a short buzz confirms "on" (feature-detected: iOS Safari has no Vibration API)
    if (next) navigator.vibrate?.(40);
    store.updateSettings({ vibration: next });
  };

  const handleOpenReset = () => setConfirmReset(true);
  const handleCancelReset = () => setConfirmReset(false);
  const handleConfirmReset = () => {
    store.resetSeenIds();
    setConfirmReset(false);
    setToast(t('settings.resetSeen.done'));
  };

  const makeOpen = (to: '/legal' | '/about') => () => {
    sound.play('sfx.tap');
    navigate({ to });
  };

  return (
    <Screen className="cb-v-settings">
      <TopBar back="/" />
      <h1 className="cb-title">{t('settings.title')}</h1>

      <div className="cb-v-list">
        <Row label={t('settings.language')}>
          <LanguagePicker variant="row" />
        </Row>

        <Row toggle label={t('settings.sound')} hint={settings.sound ? t('settings.sound.on') : t('settings.sound.off')}>
          <Switch label={t('settings.sound')} checked={settings.sound} onToggle={handleToggleSound} />
        </Row>

        <Row toggle label={t('settings.vibration')} hint={settings.vibration ? t('settings.vibration.on') : t('settings.vibration.off')}>
          <Switch label={t('settings.vibration')} checked={settings.vibration} onToggle={handleToggleVibration} />
        </Row>

        <PixelButton variant="secondary" className="cb-v-reset" onClick={handleOpenReset}>
          {t('settings.resetSeen')}
        </PixelButton>
      </div>

      <div className="cb-v-list">
        <button type="button" className="cb-mode cb-v-nav" onClick={makeOpen('/legal')}>
          <span className="cb-label">{t('settings.legal')}</span>
          <Chevron />
        </button>
        <button type="button" className="cb-mode cb-v-nav" onClick={makeOpen('/about')}>
          <span className="cb-label">{t('settings.about')}</span>
          <Chevron />
        </button>
      </div>

      {toast && <div className="cb-toast" role="status">{toast}</div>}

      {confirmReset && (
        <Sheet label={t('settings.resetSeen.confirm')}>
          <p className="cb-dialog__text">{t('settings.resetSeen.confirm')}</p>
          <div className="cb-row-2">
            <PixelButton variant="secondary" sfx="sfx.back" onClick={handleCancelReset}>
              {t('common.cancel')}
            </PixelButton>
            <PixelButton variant="negative" sfx="sfx.select" onClick={handleConfirmReset}>
              {t('common.confirm')}
            </PixelButton>
          </div>
        </Sheet>
      )}
    </Screen>
  );
};
