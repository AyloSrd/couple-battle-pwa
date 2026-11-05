import { useEffect, type FC } from 'react';
import { useLang, useT } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import type { TAvatarId } from '@/shared/game';
import type { TSoloResult } from '@/shared/save';
import { PixelButton, TeamArt } from '@/shared/Chrome';
import { rankTeams, type TGameAt, type TRankedTeam } from '../domain/machine';
import { joinNames, resolveOutcome } from '../domain/outcome';
import { gameStats } from '../domain/stats';
import { RankList } from './RankList';
import { TeamStats } from './TeamStats';
import '../results.css';

type TFinalScreenProps = {
  game: TGameAt<'final'>;
  onRematch: () => void;
  onNewGame: () => void;
  solo?: TSoloResult | undefined;
};

/** V-FinalResults — the winner on the sunburst (burst). Fanfare once on mount. */
export const FinalScreen: FC<TFinalScreenProps> = ({ game, onRematch, onNewGame, solo }) => {
  const t = useT();
  const { lang } = useLang();
  const sound = useSound();
  const { history } = game.ctx;
  const ranked = rankTeams(game.ctx);
  const outcome = resolveOutcome(ranked);
  const winner = outcome?.kind === 'winner' ? outcome.winner : undefined;
  // A game resumed from a snapshot saved before history existed has none — or only the
  // questions played after the resume. Chart only when every team's history adds up to
  // its score (always true for a game played start to finish), never a partial picture.
  const allStats = history.length > 0 ? gameStats(history, ranked.map((r) => r.team.teamId)) : [];
  const stats = ranked.every((r) => allStats.find((s) => s.teamId === r.team.teamId)?.earned === r.score) ? allStats : [];
  const teamLabel = (avatarId: TAvatarId) => t(`team.${avatarId}`);
  const headline = !outcome
    ? null
    : outcome.kind === 'winner'
      ? {
          title: t('results.winner', { team: teamLabel(outcome.winner.team.avatarId) }),
          sub: t('results.winner.sub', {
            name1: outcome.winner.team.players[0],
            name2: outcome.winner.team.players[1],
          }),
        }
      : {
          title: t('results.tie', {
            teams: joinNames(
              outcome.teams.map((r) => teamLabel(r.team.avatarId)),
              lang,
            ),
          }),
          sub: t('results.tie.sub', { score: outcome.score }),
        };

  const renderStats = (row: TRankedTeam) => {
    const teamStats = stats.find((s) => s.teamId === row.team.teamId);
    return teamStats && teamStats.hearts.length > 0 ? <TeamStats stats={teamStats} vsBest={solo} /> : null;
  };

  useEffect(() => {
    sound.play('mus.fanfare');
    sound.play('sfx.confetti');
  }, [sound]);

  return (
    <div className="cb-v-final">
      <div className="cb-glow" aria-hidden="true" />
      {winner && (
        <TeamArt
          teamId={winner.team.avatarId}
          label={teamLabel(winner.team.avatarId)}
          variant="hero"
          className="cb-reveal-in"
        />
      )}
      {outcome?.kind === 'tie' && (
        <div className="cb-final-tied" aria-hidden="true">
          {outcome.teams.map((r) => (
            <TeamArt
              key={r.team.teamId}
              teamId={r.team.avatarId}
              label={teamLabel(r.team.avatarId)}
              variant="tile"
              className="cb-reveal-in"
            />
          ))}
        </div>
      )}

      <div className="cb-final-head">
        {solo ? (
          <h1 className="cb-verdict">
            {solo.isBest
              ? t('results.solo.newBest', { points: solo.points })
              : t('results.solo.notBest', { points: solo.points, best: solo.best })}
          </h1>
        ) : (
          headline && (
            <>
              <h1 className="cb-verdict">{headline.title}</h1>
              <p className="cb-final-sub">{headline.sub}</p>
            </>
          )
        )}
      </div>

      <RankList ranked={ranked} renderExtra={renderStats} />

      <div className="cb-grow" />
      <PixelButton variant="win" sfx="sfx.select" onClick={onRematch}>
        {t('results.rematch')}
      </PixelButton>
      <PixelButton variant="ghost" onClick={onNewGame}>
        {t('results.newgame')}
      </PixelButton>
    </div>
  );
};
