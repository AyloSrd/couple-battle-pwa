import { useRef, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang, type TStringKey } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { useDraft } from '@/shared/session';
import {
  GameDifficulty,
  THEME_IDS,
  newGame,
  type TGameDifficulty,
  type TThemeId,
} from '@/shared/game';
import { useQuestionsApi, drawDeck, deckSizeFor } from '@/shared/questions';
import { selectProfile, useSave, useSaveStore } from '@/shared/save';
import { Screen, PixelPanel, PixelButton, ProgressDots, Sheet, TopBar } from '@/shared/Chrome';
import './view.css';

const DIFFS = [
  { id: GameDifficulty.Mix, nameKey: 'diff.mix.name', descKey: 'diff.mix.desc' },
  { id: GameDifficulty.Easy, nameKey: 'diff.easy.name', descKey: 'diff.easy.desc' },
  { id: GameDifficulty.Medium, nameKey: 'diff.medium.name', descKey: 'diff.medium.desc' },
  { id: GameDifficulty.Hard, nameKey: 'diff.hard.name', descKey: 'diff.hard.desc' },
] as const satisfies readonly { id: TGameDifficulty; nameKey: TStringKey; descKey: TStringKey }[];

// Emojis live here (by id), not in the question data or the strings.
const DIFF_EMOJI: Record<TGameDifficulty, string> = {
  [GameDifficulty.Mix]: '🔀',
  [GameDifficulty.Easy]: '💗',
  [GameDifficulty.Medium]: '⚡',
  [GameDifficulty.Hard]: '🔥',
};

const THEME_EMOJI: Record<TThemeId, string> = {
  homeDaily: '🏠',
  foodDrinks: '🍕',
  travel: '✈️',
  workAmbition: '💼',
  hobbies: '🎮',
  goingOut: '🎉',
  money: '💰',
  childhood: '🧸',
  personality: '🎭',
  dreams: '🚀',
  loveIntimacy: '💋',
  random: '🎲',
};

const THEME_KEY = {
  homeDaily: 'theme.homeDaily',
  foodDrinks: 'theme.foodDrinks',
  travel: 'theme.travel',
  workAmbition: 'theme.workAmbition',
  hobbies: 'theme.hobbies',
  goingOut: 'theme.goingOut',
  money: 'theme.money',
  childhood: 'theme.childhood',
  personality: 'theme.personality',
  dreams: 'theme.dreams',
  loveIntimacy: 'theme.loveIntimacy',
  random: 'theme.random',
} as const satisfies Record<TThemeId, TStringKey>;

/** All themes on; Love & Intimacy off by default in a group (>1 couple). */
function defaultThemes(coupleCount: number): TThemeId[] {
  return THEME_IDS.filter((id) => id !== 'loveIntimacy' || coupleCount <= 1);
}

export const DifficultyView: FC = () => {
  const t = useT();
  const { lang } = useLang();
  const navigate = useNavigate();
  const sound = useSound();
  const { draft } = useDraft();
  const questionsApi = useQuestionsApi();
  const store = useSaveStore();
  const { seenIds } = useSave(selectProfile);
  // S8: Start fires once — a second tap before the navigation lands draws nothing.
  const starting = useRef(false);

  const coupleCount = draft.roster?.length ?? 1;
  const [difficulty, setLocalDifficulty] = useState<TGameDifficulty>(GameDifficulty.Mix);
  const [themes, setLocalThemes] = useState<TThemeId[]>(() => defaultThemes(coupleCount));
  const [themesOpen, setThemesOpen] = useState(false);
  const [deckEmpty, setDeckEmpty] = useState(false);

  // The route guard sends a missing roster / mode to Setup; this keeps the types honest.
  if (!draft.roster || !draft.mode) return null;
  const { roster, mode } = draft;

  const makePickDifficulty = (id: TGameDifficulty) => () => {
    sound.play('sfx.select');
    setLocalDifficulty(id);
  };

  const makeToggleTheme = (id: TThemeId) => () => {
    sound.play(themes.includes(id) ? 'sfx.toggle.off' : 'sfx.toggle.on');
    setLocalThemes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const startWith = (excludeIds: number[]) => {
    if (starting.current) return;
    const deck = drawDeck(questionsApi.list({ lang }), {
      mode,
      difficulty,
      themes,
      seenIds: excludeIds,
      size: deckSizeFor(mode, coupleCount),
    });
    if (deck.length === 0) {
      setDeckEmpty(true);
      return;
    }
    starting.current = true;
    sound.play('sfx.select');
    store.startGame(newGame({ roster, mode, difficulty, themes, deck })); // synchronous: saved before we move
    navigate({ to: '/play', replace: true });
  };

  const handleStart = () => startWith(seenIds);
  const handleReshuffle = () => {
    setDeckEmpty(false);
    startWith([]); // ignore seen ids
  };
  const handleToggleThemes = () => setThemesOpen((o) => !o);
  const handleCloseDeckEmpty = () => setDeckEmpty(false);

  const intimacyWarn = themes.includes('loveIntimacy') && coupleCount > 1;

  return (
    <Screen className="cb-v-difficulty">
      <TopBar back="/mode">
        <ProgressDots total={3} current={2} />
      </TopBar>
      <h1 className="cb-title">{t('diff.title')}</h1>

      <div className="cb-diffs" role="radiogroup" aria-label={t('diff.title')}>
        {DIFFS.map((d) => (
          <button
            key={d.id}
            type="button"
            className="cb-mode"
            role="radio"
            aria-checked={difficulty === d.id}
            aria-pressed={difficulty === d.id}
            onClick={makePickDifficulty(d.id)}
          >
            <span className="cb-emoji" aria-hidden="true">
              {DIFF_EMOJI[d.id]}
            </span>
            <div>
              <h3>{t(d.nameKey)}</h3>
              <p>{t(d.descKey)}</p>
            </div>
          </button>
        ))}
      </div>

      <PixelButton
        variant="ghost"
        sfx={null}
        className="cb-themes-toggle"
        onClick={handleToggleThemes}
        aria-expanded={themesOpen}
      >
        <span aria-hidden="true">🏷️</span>
        <span className="cb-themes-toggle-label">{t('themes.title')}</span>
        <span className="cb-chevron" aria-hidden="true">
          {themesOpen ? '▲' : '▼'}
        </span>
      </PixelButton>

      {themesOpen && (
        <PixelPanel className="cb-themes">
          <p className="cb-muted">{t('themes.hint')}</p>
          <div className="cb-theme-grid">
            {THEME_IDS.map((id) => (
              <PixelButton
                key={id}
                className="cb-theme-chip"
                variant={themes.includes(id) ? 'primary' : 'secondary'}
                sfx={null}
                aria-pressed={themes.includes(id)}
                onClick={makeToggleTheme(id)}
              >
                <span className="cb-emoji" aria-hidden="true">
                  {THEME_EMOJI[id]}
                </span>
                <span>{t(THEME_KEY[id])}</span>
              </PixelButton>
            ))}
          </div>
          {intimacyWarn && <p className="cb-field-error">{t('themes.intimacy.groupWarn')}</p>}
        </PixelPanel>
      )}

      <PixelButton size="lg" sfx={null} onClick={handleStart}>
        {t('common.start')}
      </PixelButton>

      {deckEmpty && (
        <Sheet label={t('error.deckEmpty')}>
          <p className="cb-dialog__text">{t('error.deckEmpty')}</p>
          <div className="cb-row-2">
            <PixelButton variant="secondary" sfx={null} onClick={handleCloseDeckEmpty}>
              {t('common.cancel')}
            </PixelButton>
            <PixelButton sfx={null} onClick={handleReshuffle}>
              {t('common.confirm')}
            </PixelButton>
          </div>
        </Sheet>
      )}
    </Screen>
  );
};
