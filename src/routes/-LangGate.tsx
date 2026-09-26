import { useEffect, type FC, type PropsWithChildren } from 'react';
import { SAVE_DEFAULTS, useGetSave, usePutSave } from '@/shared/save';
import { useSoundApi } from '@/shared/sound';
import { LangProvider, type TLang } from '@/shared/i18n';

/**
 * Reads persisted settings once, applies the sound preference, and seeds the
 * language context (persisting changes back to settings). Renders nothing while
 * settings load (a local IndexedDB read, a few ms). If the read fails for good,
 * the app still opens on the default settings instead of staying blank.
 */
export const LangGate: FC<PropsWithChildren> = ({ children }) => {
  const settingsQuery = useGetSave('settings');
  const putSettings = usePutSave('settings');
  const soundApi = useSoundApi();
  const settings = settingsQuery.data ?? (settingsQuery.isError ? SAVE_DEFAULTS.settings : undefined);

  useEffect(() => {
    if (settings) soundApi.setEnabled(settings.sound);
  }, [soundApi, settings]);

  if (!settings) return null;

  const persistLang = (lang: TLang) => {
    putSettings.mutate({ ...settings, lang });
  };

  return (
    <LangProvider initialLang={settings.lang} onLangChange={persistLang}>
      {children}
    </LangProvider>
  );
};
