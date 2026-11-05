import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { TeamArt } from '@/shared/Chrome';
import type { TTeam } from '@/shared/game';
import '../results.css';

/** GF2 — "+N" over the scoring couple's art for ~600 ms, pure CSS (mount with a `key` per score).
 *  Decorative: the points themselves are on the scoreboard. */
export const ScorePop: FC<{ team: TTeam; points: number }> = ({ team, points }) => {
  const t = useT();
  return (
    <div className="cb-score-pop" aria-hidden="true">
      <TeamArt teamId={team.avatarId} label={t(`team.${team.avatarId}`)} variant="avatar" />
      <span className="cb-score-pop__n">+{points}</span>
    </div>
  );
};
