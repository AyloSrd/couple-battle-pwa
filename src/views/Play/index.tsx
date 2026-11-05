import { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useLang, useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { useKeepAwake } from '@/shared/wakeLock';
import { useSaveStore, type TSoloResult } from '@/shared/save';
import { useDraft } from '@/shared/session';
import { Screen, PixelButton } from '@/shared/Chrome';
import { newGame, type TGame } from '@/shared/game';
import { useQuestionsApi, type TQuestion } from '@/shared/questions';
import { useGame, type TDispatch } from './application/game';
import { countdownTicks } from './domain/beats';
import { isAt, cardOf, RAPID_KINDS } from './domain/machine';
import { DilemmaQuestion } from './components/DilemmaQuestion';
import { Countdown } from './components/Countdown';
import { DilemmaResolve } from './components/DilemmaResolve';
import { Scoreboard } from './components/Scoreboard';
import { FinalScreen } from './components/FinalScreen';
import { PauseSheet } from './components/PauseSheet';
import { Gate } from './components/Gate';
import { SecretAnswers } from './components/SecretAnswers';
import { GuessReveal } from './components/GuessReveal';
import { Judge } from './components/Judge';
import { RapidFire } from './components/RapidFire';
import { ScorePop } from './components/ScorePop';

type TStepScreenProps = {
  game: TGame;
  question: TQuestion | undefined;
  dispatch: TDispatch;
  onReady: () => void;
  onRematch: () => void;
  onNewGame: () => void;
  solo: TSoloResult | null;
};

/** The screen for the game's step. Each screen owns its handlers and sounds. */
const StepScreen: FC<TStepScreenProps> = ({ game, question, dispatch, onReady, onRematch, onNewGame, solo }) => {
  // A key per slot (or gate) remounts the screen: fresh input, and its mount cue plays again.
  const slot = 'q' in game.step && 'couple' in game.step ? `${game.ctx.seg}-${game.step.q}-${game.step.couple}` : '';
  if (isAt(game, 'ask')) return <DilemmaQuestion game={game} question={question} onReady={onReady} />;
  if (isAt(game, 'resolve')) return <DilemmaResolve game={game} question={question} dispatch={dispatch} />;
  if (isAt(game, 'gate', 'handoff')) {
    const gateKey = `${game.step.kind}-${game.step.kind === 'gate' ? game.step.side : slot}`;
    return <Gate key={gateKey} game={game} dispatch={dispatch} />;
  }
  if (isAt(game, 'secret')) return <SecretAnswers key={slot} game={game} question={question} dispatch={dispatch} />;
  if (isAt(game, 'guess')) return <GuessReveal key={slot} game={game} question={question} dispatch={dispatch} />;
  if (isAt(game, 'judge')) return <Judge game={game} question={question} dispatch={dispatch} />;
  if (isAt(game, 'rapidIntro', 'rapidTurn', 'rapidAsk', 'rapidJudge')) {
    return <RapidFire game={game} question={question} dispatch={dispatch} onReady={onReady} />;
  }
  if (isAt(game, 'scoreboard')) return <Scoreboard game={game} dispatch={dispatch} />;
  if (isAt(game, 'final')) return <FinalScreen game={game} onRematch={onRematch} onNewGame={onNewGame} solo={solo ?? undefined} />;
  return null;
};

/** `/play`: step → screen, plus what spans screens (pause, background, countdown, pop, music). */
export const PlayView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSound();
  const store = useSaveStore();
  const { draftStore } = useDraft();
  const { lang } = useLang();
  const questionsApi = useQuestionsApi();
  const { game, dispatch, soloResult, scorePop } = useGame();
  // The deck holds ids only: the text comes from the active language's bank.
  const bank = useMemo(() => new Map(questionsApi.list({ lang }).map((q) => [q.id, q])), [questionsApi, lang]);
  const [paused, setPaused] = useState(false);
  // The READY countdown is a UI beat, not a step: it runs while the game stays at its `seq`.
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
    if (game) setCountdownSeq(game.ctx.seq);
  };
  const handleCountdownDone = () => {
    setCountdownSeq(null);
    dispatch({ type: 'next' });
  };
  const setPause = (on: boolean) => {
    sound.duck(on);
    setPaused(on);
  };
  const handlePause = () => setPause(true);
  const handleResume = () => setPause(false);
  const handleRestart = () => {
    if (!game) return;
    const { roster, mode, difficulty, themes, deck, seq } = game.ctx;
    const fresh = newGame({ roster, mode, difficulty, themes, deck }); // same deck
    // seq stays monotonic, so no event from the old game can become legal again
    store.startGame({ ...fresh, ctx: { ...fresh.ctx, seq: seq + 1 } });
    setCountdownSeq(null);
    setPause(false);
  };
  const handleQuit = () => {
    sound.duck(false);
    store.quitGame();
    navigate({ to: '/' });
  };
  const handleRematch = () => {
    if (!game) return;
    // From the game itself, so Rematch also works after a cold-start resume.
    draftStore.set({ roster: game.ctx.roster, mode: null });
    store.leaveGame();
    navigate({ to: '/mode' });
  };
  const handleNewGame = () => {
    draftStore.clear();
    store.leaveGame();
    navigate({ to: '/' });
  };

  if (!game) return null;
  // The countdown owns the whole screen; the rapid-fire one says "answer" (nobody points there).
  if (countdownSeq === game.ctx.seq && isAt(game, 'ask')) {
    return <Countdown ticks={countdownTicks(game)} onDone={handleCountdownDone} />;
  }
  if (countdownSeq === game.ctx.seq && isAt(game, 'rapidAsk')) {
    return <Countdown ticks={2} go="answer" onDone={handleCountdownDone} />;
  }
  const { step } = game;
  const showPause = step.kind !== 'final';
  // The sunburst only for the theatrical beats (the countdown draws its own); the rest is calm.
  const burst = RAPID_KINDS.has(step.kind) || step.kind === 'scoreboard' || step.kind === 'final';
  const card = cardOf(game);
  const pop = scorePop?.seq === game.ctx.seq ? scorePop : null;
  const popTeam = pop ? game.ctx.roster.find((team) => team.teamId === pop.entry.teamId) : undefined;

  return (
    <Screen burst={burst} className={showPause ? 'cb-page--with-pause' : undefined}>
      {showPause && (
        <div style={{ position: 'fixed', top: 'calc(var(--cb-s3) + env(safe-area-inset-top))', right: 'var(--cb-s3)', zIndex: 20 }}>
          <PixelButton variant="ghost" block={false} onClick={handlePause} aria-label={t('pause.button')} className="cb-icon-btn">
            ⏸
          </PixelButton>
        </div>
      )}
      <StepScreen
        game={game}
        question={card ? bank.get(card.id) : undefined}
        dispatch={dispatch}
        onReady={handleReady}
        onRematch={handleRematch}
        onNewGame={handleNewGame}
        solo={soloResult}
      />
      {pop && popTeam && <ScorePop key={pop.id} team={popTeam} points={pop.entry.points} />}
      {paused && <PauseSheet onResume={handleResume} onRestart={handleRestart} onQuit={handleQuit} />}
    </Screen>
  );
};

export { PlayCrash } from './components/PlayCrash';
