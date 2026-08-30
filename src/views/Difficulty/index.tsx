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
import { useListQuestions, drawDeck } from '@/shared/questions';
import { useGetSave, usePutSave, newGameSnapshot, saveKeys } from '@/shared/save';
import { Screen, PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';

// Deck size per mode. Dilemma is the real Phase 2 slice (10 who_of_two).
// Flash/Ultime still route through the Dilemma machine as placeholders until
// Phases 3–4 give them their own states.
const DECK_SIZE = 10;

const DIFFS: { id: TGameDifficulty; nameKey: TStringKey; descKey: TStringKey; sprite: string }[] = [
  { id: GameDifficulty.Mix, nameKey: 'diff.mix.name', descKey: 'diff.mix.desc', sprite: 'diff-mix' },
  { id: GameDifficulty.Easy, nameKey: 'diff.easy.name', descKey: 'diff.easy.desc', sprite: 'diff-easy' },
  { id: GameDifficulty.Medium, nameKey: 'diff.medium.name', descKey: 'diff.medium.desc', sprite: 'diff-medium' },
  { id: GameDifficulty.Hard, nameKey: 'diff.hard.name', descKey: 'diff.hard.desc', sprite: 'diff-hard' },
];

const THEME_META: Record<TThemeId, { key: TStringKey; sprite: string }> = {
  homeDaily: { key: 'theme.homeDaily', sprite: 'theme-home' },
  foodDrinks: { key: 'theme.foodDrinks', sprite: 'theme-food' },
  travel: { key: 'theme.travel', sprite: 'theme-travel' },
  workAmbition: { key: 'theme.workAmbition', sprite: 'theme-work' },
  hobbies: { key: 'theme.hobbies', sprite: 'theme-hobbies' },
  goingOut: { key: 'theme.goingOut', sprite: 'theme-goingout' },
  money: { key: 'theme.money', sprite: 'theme-money' },
  childhood: { key: 'theme.childhood', sprite: 'theme-childhood' },
  personality: { key: 'theme.personality', sprite: 'theme-personality' },
  dreams: { key: 'theme.dreams', sprite: 'theme-dreams' },
  loveIntimacy: { key: 'theme.loveIntimacy', sprite: 'theme-intimacy' },
  random: { key: 'theme.random', sprite: 'theme-random' },
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
    const deck = drawDeck(allQuestions.data ?? [], { mode, difficulty, themes, seenIds, size: DECK_SIZE });
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
      <PixelButton variant="ghost" onClick={handleBack}>
        ← {t('common.back')}
      </PixelButton>
      <h1 className="cb-title">{t('diff.title')}</h1>

      {DIFFS.map((d) => (
        <PixelPanel
          key={d.id}
          onClick={makePickDifficulty(d.id)}
          role="button"
          tabIndex={0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--cb-s3)',
            cursor: 'pointer',
            background: difficulty === d.id ? 'var(--cb-gold)' : undefined,
          }}
        >
          <Sprite name={d.sprite} size={24} />
          <div style={{ display: 'grid', gap: 'var(--cb-s1)' }}>
            <strong className="cb-heading">{t(d.nameKey)}</strong>
            <span style={{ fontSize: 'var(--cb-fs-small)' }}>{t(d.descKey)}</span>
          </div>
        </PixelPanel>
      ))}

      <PixelButton variant="ghost" block onClick={handleToggleThemes}>
        {t('themes.title')} {themesOpen ? '▲' : '▼'}
      </PixelButton>

      {themesOpen && (
        <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s2)' }}>
          <p className="cb-muted" style={{ margin: 0, fontSize: 'var(--cb-fs-small)' }}>
            {t('themes.hint')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--cb-s2)' }}>
            {THEME_IDS.map((id) => (
              <PixelButton
                key={id}
                variant={themes.includes(id) ? 'primary' : 'ghost'}
                onClick={makeToggleTheme(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--cb-s2)', fontSize: 'var(--cb-fs-small)' }}
              >
                <Sprite name={THEME_META[id].sprite} size={16} />
                {t(THEME_META[id].key)}
              </PixelButton>
            ))}
          </div>
          {intimacyWarn && (
            <p style={{ margin: 0, fontSize: 'var(--cb-fs-small)', color: 'var(--cb-red)' }}>
              {t('themes.intimacy.groupWarn')}
            </p>
          )}
        </PixelPanel>
      )}

      <PixelButton variant="gold" block onClick={handleStart} disabled={!allQuestions.data}>
        {t('common.start')}
      </PixelButton>

      {deckEmpty && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,28,44,0.7)',
            display: 'grid',
            placeItems: 'center',
            padding: 'var(--cb-s4)',
          }}
        >
          <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s4)', maxWidth: 340 }}>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{t('error.deckEmpty')}</p>
            <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
              <PixelButton variant="ghost" block onClick={handleCloseDeckEmpty}>
                {t('common.cancel')}
              </PixelButton>
              <PixelButton variant="primary" block onClick={handleReshuffle}>
                {t('common.confirm')}
              </PixelButton>
            </div>
          </PixelPanel>
        </div>
      )}
    </Screen>
  );
};
