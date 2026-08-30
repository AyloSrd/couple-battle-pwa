import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import type { TGameState, TResult } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'resolve' }>;
  onConfirm: (result: TResult) => void;
};

/** V-DilemmaResolve — couples self-confirm match/miss, one at a time. */
export const DilemmaResolve: FC<TProps> = ({ state, onConfirm }) => {
  const t = useT();
  const active = state.roster[state.coupleIdx];
  const question = state.deck[state.questionIdx];
  const confirmedTeams = state.roster.slice(0, state.coupleIdx);

  const handleMatch = () => onConfirm('match');
  const handleMiss = () => onConfirm('miss');

  return (
    <>
      {confirmedTeams.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--cb-s2)' }}>
          <span className="cb-muted" style={{ fontSize: 'var(--cb-fs-small)' }}>
            {t('resolve.confirmed')}
          </span>
          <div style={{ display: 'flex', gap: 'var(--cb-s2)', flexWrap: 'wrap' }}>
            {confirmedTeams.map((team) => (
              <span key={team.teamId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--cb-s1)' }}>
                <Sprite name={`avatar-${team.avatarId}`} size={24} />
                {state.results[team.teamId] === 'match' ? '💥' : '❌'}
              </span>
            ))}
          </div>
        </div>
      )}

      {active && (
        <PixelPanel style={{ flex: 1, display: 'grid', gap: 'var(--cb-s4)', justifyItems: 'center', textAlign: 'center' }}>
          <Sprite name={`avatar-${active.avatarId}`} size={64} />
          <h2 className="cb-title" style={{ margin: 0 }}>
            {t('resolve.title', { team: t(`team.${active.avatarId}` as TStringKey) })}
          </h2>
          <p style={{ margin: 0, fontSize: 'var(--cb-fs-small)' }}>{question?.text}</p>
          <p className="cb-heading">{t('resolve.question')}</p>
          <div style={{ display: 'flex', gap: 'var(--cb-s2)', width: '100%' }}>
            <PixelButton variant="positive" block onClick={handleMatch}>
              {t('resolve.match')}
            </PixelButton>
            <PixelButton variant="negative" block onClick={handleMiss}>
              {t('resolve.miss')}
            </PixelButton>
          </div>
        </PixelPanel>
      )}

      <p className="cb-muted" style={{ textAlign: 'center', margin: 0, fontSize: 'var(--cb-fs-small)' }}>
        {t('resolve.liarStrip')}
      </p>
    </>
  );
};
