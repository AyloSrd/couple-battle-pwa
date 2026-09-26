import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, Chip, ProgressDots, TeamArt } from '@/shared/Chrome';
import {
  rapidQuestionOf,
  questionText,
  ULTIME_RAPID_PER_COUPLE,
  type TGameState,
} from '../domain/machine';

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

/** The couple both answer at once; `{name}` in the prompt points at the first
 *  partner (roster order) as the reference answerer. */
function answererNameOf(state: TGameState): string {
  if ('coupleIdx' in state) return state.roster[state.coupleIdx]?.players[0] ?? '';
  return '';
}

/** V-FinalRapidFire — the crown-deciding finale (Ultime), on the sunburst (burst). */
export const RapidFire: FC<TProps> = ({ state, onNext, onReady, onJudge }) => {
  const t = useT();
  const handleSynchro = () => onJudge(true);
  const handleMismatch = () => onJudge(false);

  if (state.kind === 'rapidIntro') {
    return (
      <>
        <div className="cb-glow" aria-hidden="true" />
        <div className="cb-grow" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div className="cb-stack" style={{ justifyItems: 'center', gap: 'var(--cb-s4)' }}>
            <h1 className="cb-title">{t('final.intro.title')}</h1>
            <p className="cb-body-lg" style={{ color: 'var(--cb-text-muted)' }}>
              {t('final.intro.body')}
            </p>
          </div>
        </div>
        <PixelButton onClick={onNext}>{t('common.start')}</PixelButton>
      </>
    );
  }

  if (state.kind === 'rapidTurn') {
    const team = state.roster[state.coupleIdx];
    return (
      <>
        <div className="cb-glow" aria-hidden="true" style={{ top: '34%' }} />
        <div className="cb-grow" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div className="cb-stack" style={{ justifyItems: 'center', gap: 'var(--cb-s4)', width: '100%' }}>
            {team && <TeamArt teamId={team.avatarId} label={teamNameOf(state, t)} variant="hero" className="cb-reveal-in" />}
            <h1 className="cb-title">{t('final.turn', { team: teamNameOf(state, t) })}</h1>
          </div>
        </div>
        <PixelButton onClick={onNext}>{t('common.start')}</PixelButton>
      </>
    );
  }

  const question = rapidQuestionOf(state);
  const header = (
    <div className="cb-topbar">
      <Chip>{teamNameOf(state, t)}</Chip>
      <ProgressDots total={ULTIME_RAPID_PER_COUPLE} current={state.questionIdx} />
    </div>
  );

  if (state.kind === 'rapidQuestion') {
    return (
      <>
        {header}
        <PixelPanel>
          <p className="cb-question">{questionText(question, 'name', answererNameOf(state)) || '—'}</p>
        </PixelPanel>
        <div className="cb-grow" />
        <PixelButton onClick={onReady}>{t('dilemma.ready')}</PixelButton>
      </>
    );
  }

  // rapidJudge
  return (
    <>
      {header}
      <PixelPanel>
        <p className="cb-question">{questionText(question, 'name', answererNameOf(state)) || '—'}</p>
      </PixelPanel>
      <div className="cb-grow" />
      <div className="cb-row-2">
        <PixelButton variant="positive" onClick={handleSynchro}>
          {t('final.synchro')}
        </PixelButton>
        <PixelButton variant="negative" onClick={handleMismatch}>
          {t('final.mismatch')}
        </PixelButton>
      </div>
    </>
  );
};
