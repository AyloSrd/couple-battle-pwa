import { useEffect, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, useLang, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import {
  GameDifficulty,
  THEME_IDS,
  type TGameDifficulty,
  type TThemeId,
} from '@/shared/game';
import { useQueryClient } from '@tanstack/react-query';
import { useListQuestions, drawDeck, deckSizeFor } from '@/shared/questions';
import { useGetSave, usePutSave, newGameSnapshot, saveKeys } from '@/shared/save';
import { Screen, PixelPanel, PixelButton, ProgressDots } from '@/shared/Chrome';

// Text-only for now: difficulty and theme icons aren't produced yet (v2 §3).
const DIFFS: { id: TGameDifficulty; nameKey: TStringKey; descKey: TStringKey }[] = [
  { id: GameDifficulty.Mix, nameKey: 'diff.mix.name', descKey: 'diff.mix.desc' },
  { id: GameDifficulty.Easy, nameKey: 'diff.easy.name', descKey: 'diff.easy.desc' },
  { id: GameDifficulty.Medium, nameKey: 'diff.medium.name', descKey: 'diff.medium.desc' },
  { id: GameDifficulty.Hard, nameKey: 'diff.hard.name', descKey: 'diff.hard.desc' },
];

const THEME_KEY: Record<TThemeId, TStringKey> = {
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
};

/** All themes on; Love & Intimacy off by default in a group (>1 couple). */
function defaultThemes(coupleCount: number): TThemeId[] {
  return THEME_IDS.filter((id) => id !== 'loveIntimacy' || coupleCount <= 1);
}

export const DifficultyView: FC = () => {
  const t = useT();
  const { lang } = useLang();
  const navigate = useNavigate();
  const sound = useSoundApi();
  const { draft, setDifficulty, setThemes } = useDraftGame();
  const queryClient = useQueryClient();
  const allQuestions = useListQuestions({ lang });
  const seenQuery = useGetSave('seenQuestionIds');
  const putSnapshot = usePutSave('gameSnapshot');

  const coupleCount = draft.roster?.length ?? 1;
  const [difficulty, setLocalDifficulty] = useState<TGameDifficulty>(GameDifficulty.Mix);
  const [themes, setLocalThemes] = useState<TThemeId[]>(() => defaultThemes(coupleCount));
  const [themesOpen, setThemesOpen] = useState(false);
  const [deckEmpty, setDeckEmpty] = useState(false);

  // Guard: reached without a roster/mode → back to setup.
  useEffect(() => {
    if (!draft.roster || !draft.mode) navigate({ to: '/setup' });
  }, [draft.roster, draft.mode, navigate]);

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

  const handleBack = () => {
    sound.play('sfx.back');
    navigate({ to: '/mode' });
  };

  const startWith = (seenIds: number[]) => {
    const deck = drawDeck(allQuestions.data ?? [], {
      mode,
      difficulty,
      themes,
      seenIds,
      size: deckSizeFor(mode, coupleCount),
    });
    if (deck.length === 0) {
      setDeckEmpty(true);
      return;
    }
    setDifficulty(difficulty);
    setThemes(themes);
    sound.play('sfx.select');
    putSnapshot.mutate(newGameSnapshot({ roster, mode, difficulty, themes, deck }), {
      onSuccess: (saved) => {
        // Prime the cache so Play reads the snapshot immediately (no stale-null gap).
        queryClient.setQueryData(saveKeys.byKey('gameSnapshot'), saved);
        navigate({ to: '/play' });
      },
    });
  };

  const handleStart = () => startWith(seenQuery.data ?? []);
  const handleReshuffle = () => {
    setDeckEmpty(false);
    startWith([]); // ignore seen ids
  };
  const handleToggleThemes = () => setThemesOpen((o) => !o);
  const handleCloseDeckEmpty = () => setDeckEmpty(false);

  const intimacyWarn = themes.includes('loveIntimacy') && coupleCount > 1;

  return (
    <Screen>
      <div className="cb-topbar">
        <PixelButton variant="ghost" block={false} onClick={handleBack}>
          ← {t('common.back')}
        </PixelButton>
        <ProgressDots total={3} current={2} />
      </div>
      <h1 className="cb-title" style={{ marginBottom: 'var(--cb-s2)' }}>
        {t('diff.title')}
      </h1>

      <div className="cb-stack" role="radiogroup" aria-label={t('diff.title')}>
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
            <div>
              <h3>{t(d.nameKey)}</h3>
              <p>{t(d.descKey)}</p>
            </div>
          </button>
        ))}
      </div>

      <PixelButton variant="ghost" onClick={handleToggleThemes} aria-expanded={themesOpen}>
        {t('themes.title')} {themesOpen ? '▲' : '▼'}
      </PixelButton>

      {themesOpen && (
        <PixelPanel className="cb-stack">
          <p className="cb-muted" style={{ margin: 0 }}>
            {t('themes.hint')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--cb-s2)' }}>
            {THEME_IDS.map((id) => (
              <PixelButton
                key={id}
                variant={themes.includes(id) ? 'primary' : 'secondary'}
                aria-pressed={themes.includes(id)}
                onClick={makeToggleTheme(id)}
                style={{ minHeight: 'var(--cb-h-btn-sec)', fontSize: 'var(--cb-fs-caption)' }}
              >
                {t(THEME_KEY[id])}
              </PixelButton>
            ))}
          </div>
          {intimacyWarn && <p className="cb-field-error">{t('themes.intimacy.groupWarn')}</p>}
        </PixelPanel>
      )}

      <div className="cb-grow" />
      <PixelButton onClick={handleStart} disabled={!allQuestions.data}>
        {t('common.start')}
      </PixelButton>

      {deckEmpty && (
        <div className="cb-overlay" role="dialog" aria-modal="true">
          <PixelPanel className="cb-sheet">
            <p className="cb-body-lg">{t('error.deckEmpty')}</p>
            <div className="cb-row-2">
              <PixelButton variant="secondary" onClick={handleCloseDeckEmpty}>
                {t('common.cancel')}
              </PixelButton>
              <PixelButton onClick={handleReshuffle}>{t('common.confirm')}</PixelButton>
            </div>
          </PixelPanel>
        </div>
      )}
    </Screen>
  );
};
