import { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useLang, useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { useKeepAwake } from '@/shared/wakeLock';
import { useSaveStore } from '@/shared/save';
import { useDraft } from '@/shared/session';
import { Screen, PixelButton } from '@/shared/Chrome';
import { newGame, type TResult } from '@/shared/game';
import { useQuestionsApi, type TQuestion } from '@/shared/questions';
import { useGame } from './application/game';
import {
  isAt,
  cardOf,
  flashNames,
  RAPID_KINDS,
  type TVerdict,
} from './domain/machine';
import { DilemmaQuestion } from './components/DilemmaQuestion';
import { Countdown } from './components/Countdown';
import { DilemmaResolve } from './components/DilemmaResolve';
import { Scoreboard } from './components/Scoreboard';
import { FinalScreen } from './components/FinalScreen';
import { PauseSheet } from './components/PauseSheet';
import { PassPhone } from './components/PassPhone';
import { SideGate } from './components/SideGate';
import { Handoff } from './components/Handoff';
import { SecretAnswers } from './components/SecretAnswers';
import { GuessReveal } from './components/GuessReveal';
import { Judge } from './components/Judge';
import { RapidFire } from './components/RapidFire';

export const PlayView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSound();
  const store = useSaveStore();
  const { draftStore } = useDraft();
  const { lang } = useLang();
  const questionsApi = useQuestionsApi();
  const { game, dispatch, soloResult } = useGame();

  // The deck holds ids only: the text comes from the active language's bank.
  const bank = useMemo(() => new Map(questionsApi.list({ lang }).map((q) => [q.id, q])), [questionsApi, lang]);

  const [paused, setPaused] = useState(false);
  // The READY countdown is a UI beat, not a step: it runs while the game is still at the
  // `seq` it started on (any transition ends it), then dispatches `next`.
  const [countdownSeq, setCountdownSeq] = useState<number | null>(null);

  useKeepAwake();

  // Tense loop during the rapid-fire finale; silent otherwise.
  const kind = game?.step.kind;
  useEffect(() => {
    if (kind && RAPID_KINDS.has(kind)) sound.music('mus.final');
    else sound.music(null);
    return () => sound.music(null);
  }, [kind, sound]);

  const handleReady = () => {
    if (!game) return;
    sound.play('sfx.tap');
    setCountdownSeq(game.ctx.seq);
  };
  const handleCountdownDone = () => {
    setCountdownSeq(null);
    dispatch({ type: 'next' });
  };
  const handleConfirm = (result: TResult) => {
    sound.play(result === 'match' ? 'sfx.point.exact' : 'sfx.point.miss');
    dispatch({ type: 'verdict', v: result === 'match' ? 'exact' : 'miss' });
  };
  const handleNext = () => {
    sound.play('sfx.select');
    dispatch({ type: 'next' });
  };

  // --- Flash handlers ---
  const handlePassConfirm = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'next' });
  };
  const handleLock = (value: string) => {
    sound.play('sfx.lock');
    dispatch({ type: 'answer', value });
  };
  const handleReveal = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'next' }); // the riser plays on the Judge (flip) mount
  };
  const handleAutoGuess = (value: string) => {
    sound.play('sfx.tap'); // the match/miss sound played on the pick, with the reveal
    dispatch({ type: 'guess', value });
  };
  const handleJudge = (v: TVerdict) => {
    sound.play(v === 'exact' ? 'sfx.point.exact' : v === 'close' ? 'sfx.point.close' : 'sfx.point.miss');
    dispatch({ type: 'verdict', v });
  };

  // --- Rapid-fire handlers ---
  const handleRapidNext = () => {
    sound.play('sfx.tap');
    dispatch({ type: 'next' });
  };
  const handleRapidJudge = (synchro: boolean) => {
    sound.play(synchro ? 'sfx.synchro' : 'sfx.mismatch');
    dispatch({ type: 'verdict', v: synchro ? 'exact' : 'miss' });
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
    const { roster, mode, difficulty, themes, deck } = game.ctx;
    store.startGame(newGame({ roster, mode, difficulty, themes, deck })); // same deck
    setCountdownSeq(null);
    sound.duck(false);
    setPaused(false);
  };
  const handleQuit = () => {
    sound.play('sfx.back');
    sound.duck(false);
    store.quitGame();
    navigate({ to: '/' });
  };

  const handleRematch = () => {
    if (!game) return;
    sound.play('sfx.select');
    // From the game itself, so Rematch also works after a cold-start resume.
    draftStore.set({ roster: game.ctx.roster, mode: null });
    store.leaveGame();
    navigate({ to: '/mode' });
  };
  const handleNewGame = () => {
    sound.play('sfx.tap');
    draftStore.clear();
    store.leaveGame();
    navigate({ to: '/' });
  };

  if (!game) return null;

  const card = cardOf(game);
  const question: TQuestion | undefined = card ? bank.get(card.id) : undefined;

  // The countdown owns the whole sunburst screen: 3 ticks → "POINTEZ !" for
  // Dilemma; 2 ticks → "RÉPONDEZ !" for the rapid-fire (nobody points there).
  if (countdownSeq === game.ctx.seq && game.step.kind === 'ask') return <Countdown onDone={handleCountdownDone} />;
  if (countdownSeq === game.ctx.seq && game.step.kind === 'rapidAsk') {
    return <Countdown ticks={2} go="answer" onDone={handleCountdownDone} />;
  }

  const { step } = game;
  const showPause = step.kind !== 'final';
  const solo = game.ctx.roster.length === 1;
  // Sunburst (burst) background ONLY for the theatrical beats: the rapid-fire
  // finale, the between-rounds scoreboard and the final results. Countdowns
  // render their own burst screen above. Everything else is calm Paper.
  const burst = RAPID_KINDS.has(step.kind) || step.kind === 'scoreboard' || step.kind === 'final';
  /** Names for the couple currently in the Flash spotlight. */
  const names = flashNames(game);
  const slotKey = 'q' in step && 'couple' in step ? `${game.ctx.seg}-${step.q}-${step.couple}` : '';

  return (
    <Screen burst={burst} className={showPause ? 'cb-page--with-pause' : undefined}>
      {showPause && (
        <div style={{ position: 'fixed', top: 'calc(var(--cb-s3) + env(safe-area-inset-top))', right: 'var(--cb-s3)', zIndex: 20 }}>
          <PixelButton variant="ghost" block={false} onClick={handlePause} aria-label={t('pause.title')} className="cb-icon-btn">
            ⏸
          </PixelButton>
        </div>
      )}

      {isAt(game, 'ask') && <DilemmaQuestion game={game} question={question} onReady={handleReady} />}
      {isAt(game, 'resolve') && <DilemmaResolve game={game} question={question} onConfirm={handleConfirm} />}

      {/* Flash "sofa sides": group gates for ≥2 couples; solo has no group to
          share with, so its gates are the strict no-peek pass-phone screens. */}
      {isAt(game, 'gate') &&
        (solo ? (
          <PassPhone
            key={game.step.side}
            variant={game.step.side === 'answerers' ? 'secret' : 'back'}
            game={game}
            onConfirm={handlePassConfirm}
          />
        ) : (
          <SideGate key={game.step.side} side={game.step.side} onConfirm={handlePassConfirm} />
        ))}
      {isAt(game, 'handoff') && <Handoff game={game} onConfirm={handlePassConfirm} />}
      {isAt(game, 'secret') && <SecretAnswers key={slotKey} game={game} question={question} onLock={handleLock} />}
      {isAt(game, 'guess') && (
        <GuessReveal
          key={slotKey}
          game={game}
          question={question}
          guesserName={names.guesserName}
          partnerName={names.answererName}
          onReveal={handleReveal}
          onAutoGuess={handleAutoGuess}
        />
      )}
      {isAt(game, 'judge') && (
        <Judge game={game} question={question} answererName={names.answererName} onJudge={handleJudge} />
      )}

      {isAt(game, 'rapidIntro', 'rapidTurn', 'rapidAsk', 'rapidJudge') && (
        <RapidFire game={game} question={question} onNext={handleRapidNext} onReady={handleReady} onJudge={handleRapidJudge} />
      )}

      {isAt(game, 'scoreboard') && <Scoreboard game={game} onNext={handleNext} />}
      {isAt(game, 'final') && (
        <FinalScreen game={game} onRematch={handleRematch} onNewGame={handleNewGame} solo={soloResult ?? undefined} />
      )}

      {paused && (
        <PauseSheet onResume={handleResume} onRestart={handleRestart} onQuit={handleQuit} />
      )}
    </Screen>
  );
};

export { PlayCrash } from './components/PlayCrash';
