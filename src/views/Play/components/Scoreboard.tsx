import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { PixelButton } from '@/shared/Chrome';
import type { TDispatch } from '../application/game';
import { rankTeams, type TGameAt } from '../domain/machine';
import { RankList } from './RankList';
import '../results.css';

type TProps = {
  game: TGameAt<'scoreboard'>;
  dispatch: TDispatch;
};

/** V-Scoreboard — between-rounds standings, on the sunburst (burst). */
export const Scoreboard: FC<TProps> = ({ game, dispatch }) => {
  const t = useT();
  const sound = useSound();
  const ranked = rankTeams(game.ctx);
  const allTied = ranked.every((r) => r.isWinner);
  const leader = ranked[0];

  useEffect(() => {
    sound.play('sfx.point.exact');
  }, [sound]);

  // ADS: the round-end seam — later `await showIntermission()` here, then advance.
  const handleNext = () => dispatch({ type: 'next' });

  return (
    <div className="cb-v-score">
      <h1 className="cb-title cb-score-title">{t('score.title', { n: game.ctx.seg + 1 })}</h1>

      <RankList ranked={ranked} />

      {game.ctx.roster.length > 1 && (
        <p className="cb-score-note">
          {allTied ? t('score.tied') : leader ? t('score.leader', { team: t(`team.${leader.team.avatarId}`) }) : ''}
        </p>
      )}

      <PixelButton sfx="sfx.select" onClick={handleNext}>
        {t('score.next')}
      </PixelButton>
    </div>
  );
};
