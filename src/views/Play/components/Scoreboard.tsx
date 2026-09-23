import { useEffect, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, TeamArt } from '@/shared/Chrome';
import { rankTeams, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'scoreboard' }>;
  onNext: () => void;
};

/** V-Scoreboard — between-rounds standings, on the Spotlight stage. */
export const Scoreboard: FC<TProps> = ({ state, onNext }) => {
  const t = useT();
  const sound = useSoundApi();
  const ranked = rankTeams(state);
  const allTied = ranked.every((r) => r.isWinner);
  const leader = ranked[0];

  useEffect(() => {
    sound.play('sfx.point.exact');
  }, [sound]);

  return (
    <>
      <h1 className="cb-title">{t('score.title', { n: state.round + 1 })}</h1>

      <div className="cb-rows">
        {ranked.map((row) => {
          const label = t(`team.${row.team.avatarId}` as TStringKey);
          const lead = row.isWinner && !allTied;
          return (
            <div key={row.team.teamId} className={['cb-row', lead ? 'cb-row--lead' : ''].filter(Boolean).join(' ')}>
              <TeamArt teamId={row.team.avatarId} label={label} variant="avatar" />
              <span>
                {row.team.players[0]} &amp; {row.team.players[1]}
              </span>
              <span className="cb-score">{row.score}</span>
            </div>
          );
        })}
      </div>

      {state.roster.length > 1 && (
        <p className="cb-muted cb-center" style={{ margin: 0 }}>
          {allTied
            ? t('score.tied')
            : leader
              ? t('score.leader', { team: t(`team.${leader.team.avatarId}` as TStringKey) })
              : ''}
        </p>
      )}

      <div className="cb-grow" />
      <PixelButton onClick={onNext}>{t('score.next')}</PixelButton>
    </>
  );
};
