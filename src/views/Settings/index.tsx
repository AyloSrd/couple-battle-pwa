import { useEffect, useState, type FC, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang, type TLang } from '@/shared/i18n';
import { useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, PixelButton } from '@/shared/Chrome';

const Row: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <PixelPanel
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--cb-s3)',
      padding: 'var(--cb-s4) var(--cb-s5)',
    }}
  >
    <span className="cb-label">{label}</span>
    <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>{children}</div>
  </PixelPanel>
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

  return (
    <Screen>
      <div className="cb-topbar">
        <PixelButton variant="ghost" block={false} onClick={handleBack}>
          ← {t('common.back')}
        </PixelButton>
      </div>
      <h1 className="cb-title">{t('settings.title')}</h1>

      <Row label={t('settings.language')}>
        <PixelButton variant={lang === 'fr' ? 'primary' : 'secondary'} block={false} onClick={makeSetLang('fr')} aria-pressed={lang === 'fr'}>
          FR
        </PixelButton>
        <PixelButton variant={lang === 'en' ? 'primary' : 'secondary'} block={false} onClick={makeSetLang('en')} aria-pressed={lang === 'en'}>
          EN
        </PixelButton>
      </Row>

      <Row label={t('settings.sound')}>
        <PixelButton variant={settings?.sound ? 'positive' : 'secondary'} block={false} onClick={handleToggleSound} aria-pressed={Boolean(settings?.sound)}>
          {settings?.sound ? t('settings.sound.on') : t('settings.sound.off')}
        </PixelButton>
      </Row>

      <PixelButton variant="secondary" onClick={handleOpenReset}>
        {t('settings.resetSeen')}
      </PixelButton>

      <PixelButton variant="ghost" onClick={handleLegal}>
        {t('settings.legal')}
      </PixelButton>

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
