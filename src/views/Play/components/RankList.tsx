import type { FC, ReactNode } from 'react';
import { useT } from '@/shared/i18n';
import { TeamArt } from '@/shared/Chrome';
import type { TRankedTeam } from '../domain/machine';
import '../results.css';

type TProps = {
  ranked: readonly TRankedTeam[];
  /** Extra content at the end of a team's row (the Final screen's charts). */
  renderExtra?: (row: TRankedTeam) => ReactNode;
};

/** The standings: one row per team, best first; the leader is gold unless everyone is tied. */
export const RankList: FC<TProps> = ({ ranked, renderExtra }) => {
  const t = useT();
  const allTied = ranked.every((r) => r.isWinner);
  return (
    <div className="cb-rows">
      {ranked.map((row) => (
        <div key={row.team.teamId} className={row.isWinner && !allTied ? 'cb-row cb-row--lead' : 'cb-row'}>
          <TeamArt teamId={row.team.avatarId} label={t(`team.${row.team.avatarId}`)} variant="avatar" />
          <span>
            {row.team.players[0]} &amp; {row.team.players[1]}
          </span>
          <span className="cb-score">{row.score}</span>
          {renderExtra?.(row)}
        </div>
      ))}
    </div>
  );
};
