import { useEffect, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelButton, TeamArt } from '@/shared/Chrome';
import { rankTeams, type TGameAt } from '../domain/machine';
import '../results.css';

type TProps = {
  game: TGameAt<'scoreboard'>;
  onNext: () => void;
};

/** V-Scoreboard — between-rounds standings, on the sunburst (burst). */
export const Scoreboard: FC<TProps> = ({ game, onNext }) => {
  const t = useT();
  const sound = useSound();
  const ranked = rankTeams(game.ctx);
  const allTied = ranked.every((r) => r.isWinner);
  const leader = ranked[0];

  useEffect(() => {
    sound.play('sfx.point.exact');
  }, [sound]);

  return (
    <div className="cb-v-score">
      <h1 className="cb-title cb-score-title">{t('score.title', { n: game.ctx.seg + 1 })}</h1>

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

      {game.ctx.roster.length > 1 && (
        <p className="cb-score-note">
          {allTied
            ? t('score.tied')
            : leader
              ? t('score.leader', { team: t(`team.${leader.team.avatarId}` as TStringKey) })
              : ''}
        </p>
      )}

      <PixelButton onClick={onNext}>{t('score.next')}</PixelButton>
    </div>
  );
};
