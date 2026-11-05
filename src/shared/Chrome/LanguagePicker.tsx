import { useEffect, useId, useRef, useState, type FC } from 'react';
import { LANGS, LANG_NAMES, useLang, useT, type TLang } from '@/shared/i18n';
import { useSaveStore } from '@/shared/save';
import { useSound } from '@/shared/sound';
import { ChipButton } from './Chip';
import { PixelButton } from './PixelButton';
import './chrome.css';

/** One pill per language, the current one gold (Settings row). */
const LanguageRow: FC = () => {
  const { lang } = useLang();
  const store = useSaveStore();
  const makePick = (next: TLang) => () => store.updateSettings({ lang: next });
  return (
    <>
      {LANGS.map((l) => (
        <PixelButton
          key={l}
          className="cb-lang-pill"
          variant={lang === l ? 'primary' : 'secondary'}
          block={false}
          onClick={makePick(l)}
          aria-pressed={lang === l}
          aria-label={LANG_NAMES[l]}
        >
          {l.toUpperCase()}
        </PixelButton>
      ))}
    </>
  );
};

/**
 * The current code on a chip that drops every language under it (Home). Outside taps and Escape
 * close it; the document listeners exist only while it is open.
 */
const LanguageMenu: FC = () => {
  const t = useT();
  const { lang } = useLang();
  const sound = useSound();
  const store = useSaveStore();
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

  const handleToggle = () => setOpen((v) => !v);
  const makeChoose = (next: TLang) => () => {
    sound.play('sfx.tap');
    setOpen(false);
    store.updateSettings({ lang: next });
    chipRef.current?.focus();
  };

  return (
    <div className="cb-lang" ref={rootRef}>
      <ChipButton ref={chipRef} onClick={handleToggle} aria-label={t('settings.language')} aria-expanded={open} aria-controls={listId}>
        {lang.toUpperCase()}
      </ChipButton>
      {open && (
        <ul id={listId} className="cb-lang-menu">
          {LANGS.map((l) => (
            <li key={l}>
              <button type="button" lang={l} aria-pressed={l === lang} onClick={makeChoose(l)}>
                {LANG_NAMES[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

type TLanguagePickerProps = {
  /** `menu`: a chip that opens the list (Home). `row`: one pill per language (Settings). */
  variant: 'menu' | 'row';
};

/** The one language picker. A pick is a settings change: the save store writes `settings.lang`
 *  and the language follows (one owner, no copy). */
export const LanguagePicker: FC<TLanguagePickerProps> = ({ variant }) =>
  variant === 'menu' ? <LanguageMenu /> : <LanguageRow />;
