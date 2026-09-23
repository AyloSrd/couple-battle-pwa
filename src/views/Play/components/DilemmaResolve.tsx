import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, TeamArt } from '@/shared/Chrome';
import { dilemmaQuestion, questionText, type TGameState, type TResult } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'resolve' }>;
  onConfirm: (result: TResult) => void;
};

/** V-DilemmaResolve — couples self-confirm match/miss, one at a time. */
export const DilemmaResolve: FC<TProps> = ({ state, onConfirm }) => {
  const t = useT();
  const active = state.roster[state.coupleIdx];
  const question = dilemmaQuestion(state);
  const confirmedTeams = state.roster.slice(0, state.coupleIdx);

  const handleMatch = () => onConfirm('match');
  const handleMiss = () => onConfirm('miss');

  return (
    <>
      {confirmedTeams.length > 0 && (
        <div className="cb-stack" style={{ gap: 'var(--cb-s2)' }}>
          <span className="cb-muted">{t('resolve.confirmed')}</span>
          <div style={{ display: 'flex', gap: 'var(--cb-s2)', flexWrap: 'wrap' }}>
            {confirmedTeams.map((team) => {
              const match = state.results[team.teamId] === 'match';
              return (
                <span key={team.teamId} className={['cb-badge', match ? '' : 'cb-badge--miss'].filter(Boolean).join(' ')}>
                  <TeamArt teamId={team.avatarId} label={t(`team.${team.avatarId}` as TStringKey)} variant="avatar" />
                  {match ? t('resolve.match') : t('resolve.miss')}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {active && (
        <PixelPanel className="cb-stack" style={{ justifyItems: 'center', textAlign: 'center', gap: 'var(--cb-s4)' }}>
          <TeamArt teamId={active.avatarId} label={t(`team.${active.avatarId}` as TStringKey)} variant="avatarLg" />
          <h2 className="cb-title">{t('resolve.title', { team: t(`team.${active.avatarId}` as TStringKey) })}</h2>
          <p className="cb-muted" style={{ margin: 0 }}>
            {questionText(question, 'you')}
          </p>
          <p className="cb-body-lg">{t('resolve.question')}</p>
          <div className="cb-row-2" style={{ width: '100%' }}>
            <PixelButton variant="positive" onClick={handleMatch}>
              {t('resolve.match')}
            </PixelButton>
            <PixelButton variant="negative" onClick={handleMiss}>
              {t('resolve.miss')}
            </PixelButton>
          </div>
        </PixelPanel>
      )}

      <div className="cb-grow" />
      <p className="cb-muted cb-center" style={{ margin: 0 }}>
        {t('resolve.liarStrip')}
      </p>
    </>
  );
};
