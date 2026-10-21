import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PixelPanel, PixelButton, TeamArt, Chip, ProgressDots, modeIconSmall } from '@/shared/Chrome';
import { dilemmaQuestion, dilemmaTotal, questionText, type TGameState, type TResult } from '../domain/machine';
import '../dilemma.css';

type TProps = {
  state: Extract<TGameState, { kind: 'resolve' }>;
  onConfirm: (result: TResult) => void;
};

/** V-DilemmaResolve — couples self-confirm match/miss, one at a time. */
export const DilemmaResolve: FC<TProps> = ({ state, onConfirm }) => {
  const t = useT();
  const active = state.roster[state.coupleIdx];
  const question = dilemmaQuestion(state);
  const total = dilemmaTotal(state.mode, state.deck.length);
  const confirmedTeams = state.roster.slice(0, state.coupleIdx);

  const handleMatch = () => onConfirm('match');
  const handleMiss = () => onConfirm('miss');

  return (
    <div className="cb-v-dilemma cb-v-dilemma--resolve">
      <div className="cb-topbar">
        <Chip icon={modeIconSmall('dilemma')}>{t('mode.dilemma.name')}</Chip>
        <ProgressDots total={total} current={state.questionIdx} />
      </div>

      {confirmedTeams.length > 0 && (
        <div className="cb-v-confirmed">
          <span className="cb-muted">{t('resolve.confirmed')}</span>
          <div className="cb-v-badges">
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
        <PixelPanel className="cb-v-resolve-card">
          <div className="cb-v-hero">
            <TeamArt teamId={active.avatarId} label={t(`team.${active.avatarId}` as TStringKey)} variant="hero" />
          </div>
          <h2 className="cb-v-resolve-title">{t('resolve.title', { team: t(`team.${active.avatarId}` as TStringKey) })}</h2>
          <p className="cb-v-resolve-q">{questionText(question, 'you')}</p>
          <p className="cb-body-lg cb-v-resolve-ask">{t('resolve.question')}</p>
          <div className="cb-row-2 cb-v-verdicts">
            <PixelButton variant="positive" onClick={handleMatch}>
              {t('resolve.match')}
            </PixelButton>
            <PixelButton variant="negative" onClick={handleMiss}>
              {t('resolve.miss')}
            </PixelButton>
          </div>
        </PixelPanel>
      )}

      <p className="cb-muted cb-v-liar">{t('resolve.liarStrip')}</p>
    </div>
  );
};
