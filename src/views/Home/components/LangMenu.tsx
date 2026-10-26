import { useEffect, useId, useRef, useState, type FC } from 'react';
import { LANGS, LANG_NAMES, useLang, useT, type TLang } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { ChipButton } from '@/shared/Chrome';

/**
 * Home's language chip: shows the current code, opens a small list of every language under it.
 * Outside taps and Escape close it; the document listeners exist only while it is open.
 */
export const LangMenu: FC = () => {
  const t = useT();
  const { lang, setLang } = useLang();
  const sound = useSoundApi();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      chipRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Land keyboard and screen-reader users on the current language.
    rootRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    sound.unlock();
    sound.play('sfx.tap');
    setOpen((v) => !v);
  };
  const makePick = (next: TLang) => () => {
    sound.play('sfx.tap');
    setOpen(false);
    setLang(next);
    chipRef.current?.focus();
  };

  return (
    <div className="cb-v-home-lang" ref={rootRef}>
      <ChipButton
        ref={chipRef}
        onClick={handleToggle}
        aria-label={t('settings.language')}
        aria-expanded={open}
        aria-controls={listId}
      >
        {lang.toUpperCase()}
      </ChipButton>
      {open && (
        <ul id={listId} className="cb-v-home-lang-menu">
          {LANGS.map((l) => (
            <li key={l}>
              <button type="button" lang={l} aria-pressed={l === lang} onClick={makePick(l)}>
                {LANG_NAMES[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
