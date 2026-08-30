import { useEffect, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { useWakeLockApi } from '@/shared/wakeLock';
import { useGetSave, usePutSave } from '@/shared/save';
import { useDraftGame } from '@/shared/session';
import { Screen, PixelButton, Sprite } from '@/shared/Chrome';
import {
  reduce,
  toSnapshot,
  fromSnapshot,
  initGame,
  type TGameState,
  type TResult,
} from './domain/machine';
import { DilemmaQuestion } from './components/DilemmaQuestion';
import { Countdown } from './components/Countdown';
import { DilemmaResolve } from './components/DilemmaResolve';
import { Scoreboard } from './components/Scoreboard';
import { FinalScreen, type TSoloResult } from './components/FinalScreen';
import { PauseSheet } from './components/PauseSheet';

export const PlayView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();
  const wakeLock = useWakeLockApi();
  const { reset } = useDraftGame();

  const snapshotQuery = useGetSave('gameSnapshot');
  const seenQuery = useGetSave('seenQuestionIds');
  const soloBestQuery = useGetSave('soloBest');
  const putSnapshot = usePutSave('gameSnapshot');
  const putSeen = usePutSave('seenQuestionIds');
  const putSolo = usePutSave('soloBest');

  const [game, setGame] = useState<TGameState | null>(null);
  const [paused, setPaused] = useState(false);
  const [soloResult, setSoloResult] = useState<TSoloResult | null>(null);

  // Initialize the machine from the snapshot once it loads (resume or new game).
  useEffect(() => {
    if (game === null && snapshotQuery.data) setGame(fromSnapshot(snapshotQuery.data));
  }, [game, snapshotQuery.data]);

  // No game to play → back to Home (only once the query has genuinely settled).
  useEffect(() => {
    if (game === null && snapshotQuery.isSuccess && !snapshotQuery.isFetching && !snapshotQuery.data) {
      navigate({ to: '/' });
    }
  }, [game, snapshotQuery.isSuccess, snapshotQuery.isFetching, snapshotQuery.data, navigate]);

  // Keep the screen awake while in-game.
  useEffect(() => {
    void wakeLock.request();
    return () => {
      void wakeLock.release();
    };
  }, [wakeLock]);

  const commitFinal = (final: Extract<TGameState, { kind: 'final' }>) => {
    const ids = final.deck.map((q) => q.id);
    const seen = seenQuery.data ?? [];
    putSeen.mutate(Array.from(new Set([...seen, ...ids])));
    putSnapshot.mutate(null);

    if (final.roster.length === 1) {
      const team = final.roster[0];
      const solo = soloBestQuery.data ?? { flash: 0, dilemma: 0, ultime: 0 };
      const score = team ? (final.scores[team.teamId] ?? 0) : 0;
      const prevBest = solo[final.mode];
      setSoloResult({ isBest: score > prevBest, points: score, best: Math.max(prevBest, score) });
      if (score > prevBest) putSolo.mutate({ ...solo, [final.mode]: score });
    }
  };

  const dispatch = (event: Parameters<typeof reduce>[1]) => {
    if (!game) return;
    const next = reduce(game, event);
    setGame(next);
    if (next.kind === 'final') commitFinal(next);
    else putSnapshot.mutate(toSnapshot(next));
  };

  const handleReady = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'ready' });
  };
  const handleCountdownDone = () => dispatch({ type: 'countdownDone' });
  const handleConfirm = (result: TResult) => {
    sound.play(result === 'match' ? 'sfx.point.exact' : 'sfx.point.miss');
    dispatch({ type: 'confirm', result });
  };
  const handleNext = () => {
    sound.play('sfx.select');
    dispatch({ type: 'next' });
  };

  const handlePause = () => {
    sound.play('sfx.tap');
    sound.duck(true);
    setPaused(true);
  };
  const handleResume = () => {
    sound.play('sfx.tap');
    sound.duck(false);
    setPaused(false);
  };
  const handleRestart = () => {
    if (!game) return;
    const fresh = initGame({
      roster: game.roster,
      mode: game.mode,
      difficulty: game.difficulty,
      themes: game.themes,
      deck: game.deck,
    });
    setGame(fresh);
    putSnapshot.mutate(toSnapshot(fresh));
    sound.duck(false);
    setPaused(false);
  };
  const handleQuit = () => {
    sound.play('sfx.back');
    sound.duck(false);
    putSnapshot.mutate(null);
    navigate({ to: '/' });
  };

  const handleRematch = () => {
    sound.play('sfx.select');
    navigate({ to: '/mode' }); // same roster still in the draft
  };
  const handleNewGame = () => {
    sound.play('sfx.tap');
    reset();
    navigate({ to: '/' });
  };

  if (snapshotQuery.isPending || !game) return null;

  // The countdown owns the whole ink-dark screen.
  if (game.kind === 'countdown') return <Countdown onDone={handleCountdownDone} />;

  const showPause = game.kind !== 'final';

  return (
    <Screen>
      {showPause && (
        <div style={{ position: 'fixed', top: 'var(--cb-s3)', right: 'var(--cb-s3)', zIndex: 20 }}>
          <PixelButton
            variant="ghost"
            onClick={handlePause}
            aria-label={t('pause.title')}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Sprite name="ui-pause" size={16} />
          </PixelButton>
        </div>
      )}

      {game.kind === 'question' && <DilemmaQuestion state={game} onReady={handleReady} />}
      {game.kind === 'resolve' && <DilemmaResolve state={game} onConfirm={handleConfirm} />}
      {game.kind === 'scoreboard' && <Scoreboard state={game} onNext={handleNext} />}
      {game.kind === 'final' && (
        <FinalScreen
          state={game}
          onRematch={handleRematch}
          onNewGame={handleNewGame}
          solo={soloResult ?? undefined}
        />
      )}

      {paused && (
        <PauseSheet onResume={handleResume} onRestart={handleRestart} onQuit={handleQuit} />
      )}
    </Screen>
  );
};
