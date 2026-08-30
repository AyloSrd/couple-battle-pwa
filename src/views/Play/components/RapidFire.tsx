import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import {
  rapidQuestionOf,
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

/** V-FinalRapidFire — the crown-deciding finale (Ultime). Ink spotlight vibe. */
export const RapidFire: FC<TProps> = ({ state, onNext, onReady, onJudge }) => {
  const t = useT();
  const handleSynchro = () => onJudge(true);
  const handleMismatch = () => onJudge(false);

  if (state.kind === 'rapidIntro') {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', gap: 'var(--cb-s5)' }}>
        <div style={{ display: 'grid', gap: 'var(--cb-s4)', justifyItems: 'center' }}>
          <Sprite name="ui-crown" size={48} />
          <h1 className="cb-title">{t('final.intro.title')}</h1>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{t('final.intro.body')}</p>
          <PixelButton variant="gold" block onClick={onNext}>
            {t('common.start')}
          </PixelButton>
        </div>
      </div>
    );
  }

  if (state.kind === 'rapidTurn') {
    const team = state.roster[state.coupleIdx];
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', gap: 'var(--cb-s5)' }}>
        <div style={{ display: 'grid', gap: 'var(--cb-s4)', justifyItems: 'center' }}>
          {team && <Sprite name={`avatar-${team.avatarId}`} size={96} />}
          <h1 className="cb-title">{t('final.turn', { team: teamNameOf(state, t) })}</h1>
          <PixelButton variant="gold" block onClick={onNext}>
            {t('common.start')}
          </PixelButton>
        </div>
      </div>
    );
  }

  if (state.kind === 'rapidQuestion') {
    const question = rapidQuestionOf(state);
    return (
      <>
        <p className="cb-muted" style={{ margin: 0, fontSize: 'var(--cb-fs-small)' }}>
          {t('common.question', { n: state.questionIdx + 1, total: ULTIME_RAPID_PER_COUPLE })} · {teamNameOf(state, t)}
        </p>
        <PixelPanel style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <p className="cb-question" style={{ margin: 0 }}>
            {question?.text ?? '—'}
          </p>
        </PixelPanel>
        <PixelButton variant="gold" block onClick={onReady} style={{ fontSize: 'var(--cb-fs-title)' }}>
          {t('dilemma.ready')}
        </PixelButton>
      </>
    );
  }

  // rapidJudge
  const question = rapidQuestionOf(state);
  return (
    <>
      <PixelPanel style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <p className="cb-question" style={{ margin: 0 }}>
          {question?.text ?? '—'}
        </p>
      </PixelPanel>
      <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
        <PixelButton variant="positive" block onClick={handleSynchro}>
          {t('final.synchro')}
        </PixelButton>
        <PixelButton variant="negative" block onClick={handleMismatch}>
          {t('final.mismatch')}
        </PixelButton>
      </div>
    </>
  );
};
