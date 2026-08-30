import { useEffect, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, type TStringKey } from '@/shared/i18n';
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
  flashQuestion,
  answererIndex,
  type TGameState,
  type TResult,
  type TVerdict,
} from './domain/machine';
import { DilemmaQuestion } from './components/DilemmaQuestion';
import { Countdown } from './components/Countdown';
import { DilemmaResolve } from './components/DilemmaResolve';
import { Scoreboard } from './components/Scoreboard';
import { FinalScreen, type TSoloResult } from './components/FinalScreen';
import { PauseSheet } from './components/PauseSheet';
import { PassPhone } from './components/PassPhone';
import { SecretAnswers } from './components/SecretAnswers';
import { GuessReveal } from './components/GuessReveal';
import { Judge } from './components/Judge';
import { RapidFire } from './components/RapidFire';

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

  // Tense loop during the rapid-fire finale; silent otherwise.
  const kind = game?.kind;
  useEffect(() => {
    if (kind && kind.startsWith('rapid')) sound.music('mus.final');
    else sound.music(null);
    return () => sound.music(null);
  }, [kind, sound]);

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

  // --- Flash handlers ---
  const handlePassConfirm = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'passConfirm' });
  };
  const handleLock = (answer: string) => {
    sound.play('sfx.lock');
    dispatch({ type: 'lockAnswer', answer });
  };
  const handleReveal = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'reveal' }); // the riser plays on the Judge (flip) mount
  };
  const handleAutoGuess = (guess: string) => {
    if (game?.kind !== 'guess') return;
    const q = flashQuestion(game);
    const truth = q ? game.secretAnswers[String(q.id)] : undefined;
    sound.play(truth !== undefined && guess === truth ? 'sfx.point.exact' : 'sfx.point.miss');
    dispatch({ type: 'autoGuess', guess });
  };
  const handleJudge = (verdict: TVerdict) => {
    sound.play(verdict === 'exact' ? 'sfx.point.exact' : verdict === 'close' ? 'sfx.point.close' : 'sfx.point.miss');
    dispatch({ type: 'judge', verdict });
  };

  // --- Rapid-fire handlers ---
  const handleRapidNext = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'next' });
  };
  const handleRapidReady = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'ready' });
  };
  const handleRapidJudge = (synchro: boolean) => {
    sound.play(synchro ? 'sfx.synchro' : 'sfx.mismatch');
    dispatch({ type: 'rapidJudge', synchro });
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

  // The countdown owns the whole ink-dark screen (3 ticks Dilemma, 2 rapid-fire).
  if (game.kind === 'countdown') return <Countdown onDone={handleCountdownDone} />;
  if (game.kind === 'rapidCountdown') return <Countdown ticks={2} onDone={handleCountdownDone} />;

  const showPause = game.kind !== 'final';

  /** Names for the couple currently in the Flash spotlight. */
  const namesFor = (round: number, coupleIdx: number) => {
    const team = game.roster[coupleIdx];
    const aIdx = answererIndex(round);
    return {
      avatarId: team?.avatarId ?? 'penguins',
      teamName: team ? t(`team.${team.avatarId}` as TStringKey) : '',
      answererName: team?.players[aIdx] ?? '',
      guesserName: team?.players[1 - aIdx] ?? '',
    };
  };

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

      {game.kind === 'passSecret' &&
        (() => {
          const n = namesFor(game.round, game.coupleIdx);
          return (
            <PassPhone
              variant="secret"
              avatarId={n.avatarId}
              name={n.answererName}
              teamName={n.teamName}
              onConfirm={handlePassConfirm}
            />
          );
        })()}
      {game.kind === 'secretInput' && (
        <SecretAnswers key={game.questionIdx} state={game} onLock={handleLock} />
      )}
      {game.kind === 'passBack' && (
        <PassPhone
          variant="back"
          avatarId={namesFor(game.round, game.coupleIdx).avatarId}
          onConfirm={handlePassConfirm}
        />
      )}
      {game.kind === 'guess' &&
        (() => {
          const n = namesFor(game.round, game.coupleIdx);
          return (
            <GuessReveal
              state={game}
              guesserName={n.guesserName}
              partnerName={n.answererName}
              onReveal={handleReveal}
              onAutoGuess={handleAutoGuess}
            />
          );
        })()}
      {game.kind === 'judge' && (
        <Judge
          state={game}
          answererName={namesFor(game.round, game.coupleIdx).answererName}
          onJudge={handleJudge}
        />
      )}

      {(game.kind === 'rapidIntro' ||
        game.kind === 'rapidTurn' ||
        game.kind === 'rapidQuestion' ||
        game.kind === 'rapidJudge') && (
        <RapidFire
          state={game}
          onNext={handleRapidNext}
          onReady={handleRapidReady}
          onJudge={handleRapidJudge}
        />
      )}

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
