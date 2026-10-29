import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, ProgressDots, TeamArt } from '@/shared/Chrome';
import {
  rapidQuestionOf,
  questionText,
  rapidSubjectIndex,
  ULTIME_RAPID_PER_COUPLE,
  type TGameState,
} from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import '../results.css';

type TRapidState = Extract<
  TGameState,
  { kind: 'rapidIntro' | 'rapidTurn' | 'rapidQuestion' | 'rapidJudge' }
>;

type TProps = {
  state: TRapidState;
  onNext: () => void; // intro / turn → advance
  onReady: () => void; // question → countdown
  onJudge: (synchro: boolean) => void;
};

function teamNameOf(state: TGameState, t: ReturnType<typeof useT>): string {
  if ('coupleIdx' in state) {
    const team = state.roster[state.coupleIdx];
    if (team) return t(`team.${team.avatarId}` as TStringKey);
  }
  return '';
}

/** The couple both answer at once; `{name}` in the prompt alternates between
 *  the two partners from one question to the next. */
function subjectNameOf(state: TGameState): string {
  if ('coupleIdx' in state && 'questionIdx' in state) {
    return state.roster[state.coupleIdx]?.players[rapidSubjectIndex(state.questionIdx)] ?? '';
  }
  return '';
}

/** V-FinalRapidFire — the crown-deciding finale (Ultime), on the sunburst (burst). */
export const RapidFire: FC<TProps> = ({ state, onNext, onReady, onJudge }) => {
  const t = useT();
  const handleSynchro = () => onJudge(true);
  const handleMismatch = () => onJudge(false);

  if (state.kind === 'rapidIntro') {
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

  if (state.kind === 'rapidTurn') {
    const team = state.roster[state.coupleIdx];
    return (
      <div className="cb-v-rapid">
        <div className="cb-glow" aria-hidden="true" />
        <div className="cb-rapid-stage">
          {team && <TeamArt teamId={team.avatarId} label={teamNameOf(state, t)} variant="hero" className="cb-reveal-in" />}
          <h1 className="cb-title cb-rapid-turn">{t('final.turn', { team: teamNameOf(state, t) })}</h1>
          <ActorBadge state={state} variant="hero" />
        </div>
        <PixelButton onClick={onNext}>{t('common.start')}</PixelButton>
      </div>
    );
  }

  const question = rapidQuestionOf(state);
  const header = (
    <div className="cb-topbar">
      <ActorBadge state={state} variant="row" />
      <ProgressDots total={ULTIME_RAPID_PER_COUPLE} current={state.questionIdx} />
    </div>
  );
  const questionCard = (
    <PixelPanel className="cb-rapid-question">
      <p className="cb-question">{questionText(question, 'name', subjectNameOf(state)) || '—'}</p>
    </PixelPanel>
  );

  if (state.kind === 'rapidQuestion') {
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
