import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSound, type TSoundId } from '@/shared/sound';
import { PixelButton, usePrefersReducedMotion } from '@/shared/Chrome';
import type { TScreenProps } from '../application/game';
import { boardBlockLength, countedValue, previousScores } from '../domain/beats';
import { rankTeams, type TRankedTeam } from '../domain/machine';
import { RankList } from './RankList';
import { useCountUp } from './useCountUp';
import '../results.css';

const TALLY_MS = 1000;

/** The one team ahead, or null (a tie, or a single couple). */
function soleLeader(ranked: readonly TRankedTeam[]): string | null {
  const leaders = ranked.filter((r) => r.isWinner);
  return ranked.length > 1 && leaders.length === 1 ? (leaders[0]?.team.teamId ?? null) : null;
}

/** V-Scoreboard — the round stinger, the scores count up from the previous board, then the
 *  leader settles at #1 (a lead change and a tie sound different). Reduced motion: at once. */
export const Scoreboard: FC<Omit<TScreenProps<'scoreboard'>, 'question'>> = ({ game, dispatch }) => {
  const t = useT();
  const sound = useSound();
  const reduced = usePrefersReducedMotion();
  const { roster, scores } = game.ctx;
  const ranked = rankTeams(game.ctx);
  const allTied = ranked.every((r) => r.isWinner);
  const leader = ranked[0];
  const before = previousScores(game.ctx, boardBlockLength(game));
  const from = (teamId: string) => before?.[teamId] ?? scores[teamId] ?? 0;
  const steps = reduced || !before ? 0 : Math.max(0, ...roster.map((team) => (scores[team.teamId] ?? 0) - from(team.teamId)));
  const previousLeader = before ? soleLeader(rankTeams({ roster, scores: before })) : null;
  const settleCue: TSoundId =
    roster.length > 1 && allTied
      ? 'sfx.point.close'
      : previousLeader && soleLeader(ranked) !== previousLeader
        ? 'sfx.synchro'
        : 'sfx.point.exact';
  // the stinger first (effects run in order), then the count
  useEffect(() => {
    sound.play('mus.round');
  }, [sound]);
  const handleTick = () => sound.play('sfx.score.tally');
  const handleSettle = () => sound.play(settleCue);
  const counted = useCountUp({ steps, durationMs: TALLY_MS, onTick: handleTick, onDone: handleSettle });
  const settled = counted >= steps;
  // While counting: the previous order, nobody gold yet.
  const rows: TRankedTeam[] = settled
    ? ranked
    : rankTeams({ roster, scores: before ?? scores }).map((row) => ({
        ...row,
        score: countedValue(from(row.team.teamId), scores[row.team.teamId] ?? 0, counted),
        isWinner: false,
      }));
  // ADS: the round-end seam, after the tally beat — later `await showIntermission()` here, then advance.
  const handleNext = () => dispatch({ type: 'next' });

  return (
    <div className="cb-v-score">
      <h1 className="cb-title cb-score-title">{t('score.title', { n: game.ctx.seg + 1 })}</h1>
      <RankList ranked={rows} settle={steps > 0} />
      {roster.length > 1 && (
        <p className={settled ? 'cb-score-note' : 'cb-score-note cb-score-note--pending'}>
          {allTied ? t('score.tied') : leader ? t('score.leader', { team: t(`team.${leader.team.avatarId}`) }) : ''}
        </p>
      )}
      <PixelButton sfx="sfx.select" onClick={handleNext}>
        {t('score.next')}
      </PixelButton>
    </div>
  );
};
