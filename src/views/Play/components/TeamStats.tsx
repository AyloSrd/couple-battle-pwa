import type { CSSProperties, FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import type { THeart, TTeamStats } from '../domain/stats';

/** The solo record line: this game's points against the mode's best. */
export type TVsBest = { points: number; best: number };

type TTeamStatsProps = {
  stats: TTeamStats;
  /** Solo only: adds the "this game vs your best" bars. */
  vsBest?: TVsBest | undefined;
};

const pct = (earned: number, possible: number) => (possible === 0 ? 0 : Math.round((earned / possible) * 100));

/** A horizontal bar; the width travels as a CSS custom property (no inline layout). */
const Meter: FC<{ value: number; tone?: 'gold' | 'pink' }> = ({ value, tone = 'gold' }) => (
  <span className="cb-meter" aria-hidden="true">
    <span
      className={`cb-meter-fill cb-meter-fill--${tone}`}
      style={{ '--cb-fill': `${Math.min(100, Math.max(0, value))}%` } as CSSProperties}
    />
  </span>
);

const HEART_PATH = 'M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z';
const HALF_PATH = 'M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8z';

/** One question: full (gold), half (left half gold), empty (outline only). */
const Heart: FC<{ kind: THeart }> = ({ kind }) => (
  <svg className={`cb-heart cb-heart--${kind}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path className="cb-heart-shape" d={HEART_PATH} />
    {kind === 'half' && <path className="cb-heart-half" d={HALF_PATH} />}
  </svg>
);

/**
 * Per-team charts for the final screen: a sync meter, one heart per scored
 * question, per-stage bars (Ultime, or the two Flash rounds) and — solo only —
 * this game against the best. Purely presentational: the numbers come from
 * `teamStats`, nothing here reads state or runs effects.
 */
export const TeamStats: FC<TTeamStatsProps> = ({ stats, vsBest }) => {
  const t = useT();
  const stageLabel = (stage: 'flash' | 'dilemma' | 'rapid') => t(`results.stats.stage.${stage}` as TStringKey);

  const segments =
    stats.byStage.length > 1
      ? stats.byStage.map((s) => ({ key: s.stage, label: stageLabel(s.stage), earned: s.earned, possible: s.possible }))
      : stats.flashRounds.length > 1
        ? stats.flashRounds.map((r, i, all) => ({
            key: `flash-${r.round}`,
            label: t('common.round', { n: i + 1, total: all.length }),
            earned: r.earned,
            possible: r.possible,
          }))
        : [];

  const full = stats.hearts.filter((h) => h === 'full').length;
  const half = stats.hearts.filter((h) => h === 'half').length;
  const summary = t(half > 0 ? 'results.stats.hearts.close' : 'results.stats.hearts', {
    full,
    total: stats.hearts.length,
    half,
  });
  const scale = vsBest ? Math.max(vsBest.points, vsBest.best, 1) : 1;

  return (
    <div className="cb-stats">
      <div className="cb-stats-sync">
        <span className="cb-stats-label">{t('results.stats.sync')}</span>
        <Meter value={stats.syncPct} />
        <span className="cb-stats-pct">{stats.syncPct}%</span>
      </div>

      <div className="cb-hearts" role="img" aria-label={summary}>
        {stats.hearts.map((kind, i) => (
          <Heart key={i} kind={kind} />
        ))}
      </div>

      {segments.length > 0 && (
        <ul className="cb-stages">
          {segments.map((s) => (
            <li key={s.key} className="cb-stage">
              <span className="cb-stats-label">{s.label}</span>
              <Meter value={pct(s.earned, s.possible)} />
            </li>
          ))}
        </ul>
      )}

      {vsBest && (
        <ul className="cb-vsbest">
          <li>
            <span className="cb-stats-label">{t('results.stats.solo.now')}</span>
            <Meter value={(vsBest.points / scale) * 100} />
            <span className="cb-stats-pct">{vsBest.points}</span>
          </li>
          <li>
            <span className="cb-stats-label">{t('results.stats.solo.best')}</span>
            <Meter value={(vsBest.best / scale) * 100} tone="pink" />
            <span className="cb-stats-pct">{vsBest.best}</span>
          </li>
        </ul>
      )}
    </div>
  );
};
