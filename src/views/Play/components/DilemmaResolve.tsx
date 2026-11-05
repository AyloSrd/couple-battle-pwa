import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, TeamArt, Chip, ProgressDots, modeIconSmall } from '@/shared/Chrome';
import type { TQuestion } from '@/shared/questions';
import type { TDispatch } from '../application/game';
import { questionText, segmentLength, type TGameAt } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import '../dilemma.css';

type TProps = {
  game: TGameAt<'resolve'>;
  question: TQuestion | undefined;
  dispatch: TDispatch;
};

/** V-DilemmaResolve — couples self-confirm match/miss, one at a time. */
export const DilemmaResolve: FC<TProps> = ({ game, question, dispatch }) => {
  const t = useT();
  const { ctx, step } = game;
  const active = ctx.roster[step.couple];
  const total = segmentLength(ctx);
  const confirmedTeams = ctx.roster.slice(0, step.couple);

  const handleMatch = () => dispatch({ type: 'verdict', v: 'exact' });
  const handleMiss = () => dispatch({ type: 'verdict', v: 'miss' });

  return (
    <div className="cb-v-dilemma cb-v-dilemma--resolve">
      <div className="cb-topbar">
        <Chip icon={modeIconSmall('dilemma')}>{t('mode.dilemma.name')}</Chip>
        <ProgressDots total={total} current={step.q} />
      </div>

      {confirmedTeams.length > 0 && (
        <div className="cb-v-confirmed">
          <span className="cb-muted">{t('resolve.confirmed')}</span>
          <div className="cb-v-badges">
            {confirmedTeams.map((team) => {
              const match = step.results[team.teamId] === 'match';
              return (
                <span key={team.teamId} className={['cb-badge', match ? '' : 'cb-badge--miss'].filter(Boolean).join(' ')}>
                  <TeamArt teamId={team.avatarId} label={t(`team.${team.avatarId}`)} variant="avatar" />
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
            <TeamArt teamId={active.avatarId} label={t(`team.${active.avatarId}`)} variant="hero" />
          </div>
          <h2 className="cb-v-resolve-title">{t('resolve.title', { team: t(`team.${active.avatarId}`) })}</h2>
          <ActorBadge game={game} variant="hero" />
          <p className="cb-v-resolve-q">{questionText(question, 'you')}</p>
          <p className="cb-body-lg cb-v-resolve-ask">{t('resolve.question')}</p>
          <div className="cb-row-2 cb-v-verdicts">
            <PixelButton variant="positive" size="lg" sfx="sfx.point.exact" onClick={handleMatch}>
              {t('resolve.match')}
            </PixelButton>
            <PixelButton variant="negative" size="lg" sfx="sfx.point.miss" onClick={handleMiss}>
              {t('resolve.miss')}
            </PixelButton>
          </div>
        </PixelPanel>
      )}

      <p className="cb-muted cb-v-liar">{t('resolve.liarStrip')}</p>
    </div>
  );
};
