import { useEffect, useState, type FC, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang, type TLang } from '@/shared/i18n';
import { useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, PixelButton, BackButton } from '@/shared/Chrome';
import './view.css';

const Row: FC<{ label: string; hint?: string; children: ReactNode }> = ({ label, hint, children }) => (
  <PixelPanel className="cb-v-row">
    <div className="cb-v-row-text">
      <span className="cb-label">{label}</span>
      {hint && <span className="cb-muted">{hint}</span>}
    </div>
    <div className="cb-v-row-ctl">{children}</div>
  </PixelPanel>
);

/** A big on/off switch. `label` names it for assistive tech (the row label is visual only). */
const Switch: FC<{ label: string; checked: boolean; disabled: boolean; onToggle: () => void }> = ({
  label,
  checked,
  disabled,
  onToggle,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className="cb-v-switch"
    onClick={onToggle}
  >
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
  const { lang, setLang } = useLang();
  const sound = useSoundApi();
  const settingsQuery = useGetSave('settings');
  const putSettings = usePutSave('settings');
  const putSeen = usePutSave('seenQuestionIds');
  const settings = settingsQuery.data;

  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const makeSetLang = (next: TLang) => () => {
    sound.play('sfx.tap');
    setLang(next);
  };

  const handleToggleSound = () => {
    if (!settings) return;
    const next = !settings.sound;
    sound.setEnabled(next);
    sound.play(next ? 'sfx.toggle.on' : 'sfx.toggle.off');
    putSettings.mutate({ ...settings, sound: next });
  };

  const handleToggleVibration = () => {
    if (!settings) return;
    const next = !settings.vibration;
    sound.play(next ? 'sfx.toggle.on' : 'sfx.toggle.off');
    // a short buzz confirms "on" (feature-detected: iOS Safari has no Vibration API)
    if (next) navigator.vibrate?.(40);
    putSettings.mutate({ ...settings, vibration: next });
  };

  const handleOpenReset = () => {
    sound.play('sfx.tap');
    setConfirmReset(true);
  };
  const handleCancelReset = () => {
    sound.play('sfx.back');
    setConfirmReset(false);
  };
  const handleConfirmReset = () => {
    putSeen.mutate([]);
    sound.play('sfx.select');
    setConfirmReset(false);
    setToast(t('settings.resetSeen.done'));
  };

  const handleBack = () => {
    sound.play('sfx.back');
    navigate({ to: '/' });
  };
  const handleLegal = () => {
    sound.play('sfx.tap');
    navigate({ to: '/legal' });
  };
  const handleAbout = () => {
    sound.play('sfx.tap');
    navigate({ to: '/about' });
  };

  return (
    <Screen className="cb-v-settings">
      <div className="cb-topbar">
        <BackButton label={t('common.back')} onClick={handleBack} />
      </div>
      <h1 className="cb-title">{t('settings.title')}</h1>

      <div className="cb-v-list">
        <Row label={t('settings.language')}>
          <PixelButton variant={lang === 'fr' ? 'primary' : 'secondary'} block={false} onClick={makeSetLang('fr')} aria-pressed={lang === 'fr'}>
            FR
          </PixelButton>
          <PixelButton variant={lang === 'en' ? 'primary' : 'secondary'} block={false} onClick={makeSetLang('en')} aria-pressed={lang === 'en'}>
            EN
          </PixelButton>
        </Row>

        <Row label={t('settings.sound')} hint={settings?.sound ? t('settings.sound.on') : t('settings.sound.off')}>
          <Switch label={t('settings.sound')} checked={Boolean(settings?.sound)} disabled={!settings} onToggle={handleToggleSound} />
        </Row>

        <Row label={t('settings.vibration')} hint={settings?.vibration ? t('settings.vibration.on') : t('settings.vibration.off')}>
          <Switch
            label={t('settings.vibration')}
            checked={Boolean(settings?.vibration)}
            disabled={!settings}
            onToggle={handleToggleVibration}
          />
        </Row>

        <PixelButton variant="secondary" className="cb-v-reset" onClick={handleOpenReset}>
          {t('settings.resetSeen')}
        </PixelButton>
      </div>

      <div className="cb-v-list">
        <button type="button" className="cb-mode cb-v-nav" onClick={handleLegal}>
          <span className="cb-label">{t('settings.legal')}</span>
          <Chevron />
        </button>
        <button type="button" className="cb-mode cb-v-nav" onClick={handleAbout}>
          <span className="cb-label">{t('settings.about')}</span>
          <Chevron />
        </button>
      </div>

      {toast && (
        <div className="cb-toast" role="status">
          {toast}
        </div>
      )}

      {confirmReset && (
        <div className="cb-overlay" role="dialog" aria-modal="true">
          <PixelPanel className="cb-sheet">
            <p className="cb-body-lg">{t('settings.resetSeen.confirm')}</p>
            <div className="cb-row-2">
              <PixelButton variant="secondary" onClick={handleCancelReset}>
                {t('common.cancel')}
              </PixelButton>
              <PixelButton variant="negative" onClick={handleConfirmReset}>
                {t('common.confirm')}
              </PixelButton>
            </div>
          </PixelPanel>
        </div>
      )}
    </Screen>
  );
};
