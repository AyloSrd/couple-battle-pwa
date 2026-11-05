import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, ProgressDots, TeamArt } from '@/shared/Chrome';
import type { TQuestion } from '@/shared/questions';
import { questionText, rapidSubjectIndex, segmentLength, teamOf, type TGameAt } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import '../results.css';

type TProps = {
  game: TGameAt<'rapidIntro' | 'rapidTurn' | 'rapidAsk' | 'rapidJudge'>;
  /** The card's text in the active language (rapidAsk / rapidJudge). */
  question: TQuestion | undefined;
  onNext: () => void; // intro / turn → advance
  onReady: () => void; // question → countdown
  onJudge: (synchro: boolean) => void;
};

/** V-FinalRapidFire — the crown-deciding finale (Ultime), on the sunburst (burst). */
export const RapidFire: FC<TProps> = ({ game, question, onNext, onReady, onJudge }) => {
  const t = useT();
  const handleSynchro = () => onJudge(true);
  const handleMismatch = () => onJudge(false);
  const { step } = game;
  const team = teamOf(game);
  const teamName = team ? t(`team.${team.avatarId}` as TStringKey) : '';

  if (step.kind === 'rapidIntro') {
    return (
      <div className="cb-v-rapid">
        <div className="cb-glow" aria-hidden="true" />
        <div className="cb-rapid-stage">
          <h1 className="cb-title cb-rapid-title">{t('final.intro.title')}</h1>
          <PixelPanel className="cb-rapid-card">
            <p>{t('final.intro.body')}</p>
          </PixelPanel>
        </div>
        <PixelButton onClick={onNext}>{t('common.start')}</PixelButton>
      </div>
    );
  }

  if (step.kind === 'rapidTurn') {
    return (
      <div className="cb-v-rapid">
        <div className="cb-glow" aria-hidden="true" />
        <div className="cb-rapid-stage">
          {team && <TeamArt teamId={team.avatarId} label={teamName} variant="hero" className="cb-reveal-in" />}
          <h1 className="cb-title cb-rapid-turn">{t('final.turn', { team: teamName })}</h1>
          <ActorBadge game={game} variant="hero" />
        </div>
        <PixelButton onClick={onNext}>{t('common.start')}</PixelButton>
      </div>
    );
  }

  // The couple both answer at once; `{name}` alternates between the partners question by question.
  const subjectName = team?.players[rapidSubjectIndex(step.q)] ?? '';
  const header = (
    <div className="cb-topbar">
      <ActorBadge game={game} variant="row" />
      <ProgressDots total={segmentLength(game.ctx)} current={step.q} />
    </div>
  );
  const questionCard = (
    <PixelPanel className="cb-rapid-question">
      <p className="cb-question">{questionText(question, 'name', subjectName) || '—'}</p>
    </PixelPanel>
  );

  if (step.kind === 'rapidAsk') {
    return (
      <div className="cb-v-rapid">
        {header}
        {questionCard}
        <PixelButton onClick={onReady}>{t('dilemma.ready')}</PixelButton>
      </div>
    );
  }

  // rapidJudge
  return (
    <div className="cb-v-rapid">
      {header}
      {questionCard}
      <div className="cb-row-2 cb-rapid-judge">
        <PixelButton variant="positive" onClick={handleSynchro}>
          {t('final.synchro')}
        </PixelButton>
        <PixelButton variant="negative" onClick={handleMismatch}>
          {t('final.mismatch')}
        </PixelButton>
      </div>
    </div>
  );
};
