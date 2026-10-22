import { useEffect, type FC } from 'react';
import { useLang, useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton, TeamArt } from '@/shared/Chrome';
import { rankTeams, type TGameState } from '../domain/machine';
import { joinNames, resolveOutcome } from '../domain/outcome';
import { gameStats } from '../domain/stats';
import { TeamStats } from './TeamStats';
import '../results.css';

/** Solo record outcome (only for a 1-couple game). */
export type TSoloResult = { isBest: boolean; points: number; best: number };

type TFinalScreenProps = {
  state: Extract<TGameState, { kind: 'final' }>;
  onRematch: () => void;
  onNewGame: () => void;
  solo?: TSoloResult | undefined;
};

/** V-FinalResults — the winner on the sunburst (burst). Fanfare once on mount. */
export const FinalScreen: FC<TFinalScreenProps> = ({ state, onRematch, onNewGame, solo }) => {
  const t = useT();
  const { lang } = useLang();
  const sound = useSoundApi();
  const ranked = rankTeams(state);
  const outcome = resolveOutcome(ranked);
  const winner = outcome?.kind === 'winner' ? outcome.winner : undefined;
  const allTied = ranked.every((r) => r.isWinner);
  // A game resumed from a snapshot saved before history existed has none: no charts.
  const stats = state.history.length > 0 ? gameStats(state.history, ranked.map((r) => r.team.teamId)) : [];
  const teamLabel = (avatarId: string) => t(`team.${avatarId}` as TStringKey);
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
          label={t(`team.${winner.team.avatarId}` as TStringKey)}
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

      <div className="cb-rows">
        {ranked.map((row) => {
          const label = t(`team.${row.team.avatarId}` as TStringKey);
          const lead = row.isWinner && !allTied;
          const teamStats = stats.find((s) => s.teamId === row.team.teamId);
          return (
            <div key={row.team.teamId} className={['cb-row', lead ? 'cb-row--lead' : ''].filter(Boolean).join(' ')}>
              <TeamArt teamId={row.team.avatarId} label={label} variant="avatar" />
              <span>
                {row.team.players[0]} &amp; {row.team.players[1]}
              </span>
              <span className="cb-score">{row.score}</span>
              {teamStats && teamStats.hearts.length > 0 && <TeamStats stats={teamStats} vsBest={solo} />}
            </div>
          );
        })}
      </div>

      <div className="cb-grow" />
      <PixelButton variant="win" onClick={onRematch}>
        {t('results.rematch')}
      </PixelButton>
      <PixelButton variant="ghost" onClick={onNewGame}>
        {t('results.newgame')}
      </PixelButton>
    </div>
  );
};
