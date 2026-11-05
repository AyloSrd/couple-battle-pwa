import type { CSSProperties, FC } from 'react';
import { useT } from '@/shared/i18n';
import type { THeart, TTeamStats } from '../domain/stats';

type TTeamStatsProps = {
  stats: TTeamStats;
  /** Solo only: this game's points against the mode's best. */
  vsBest?: { points: number; best: number } | undefined;
};

const pct = (earned: number, possible: number) => (possible === 0 ? 0 : Math.round((earned / possible) * 100));

// A bar (the width travels as a CSS custom property) and a heart: full, half (left half) or empty.
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

const Heart: FC<{ kind: THeart }> = ({ kind }) => (
  <svg className={`cb-heart cb-heart--${kind}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path className="cb-heart-shape" d={HEART_PATH} />
    {kind === 'half' && <path className="cb-heart-half" d={HALF_PATH} />}
  </svg>
);

/** A team's charts on the Final screen: sync meter, a heart per question, per-stage bars, and
 *  (solo) this game against the best. */
export const TeamStats: FC<TTeamStatsProps> = ({ stats, vsBest }) => {
  const t = useT();
  const segments =
    stats.byStage.length > 1
      ? stats.byStage.map((s) => ({ key: s.stage, label: t(`results.stats.stage.${s.stage}`), value: pct(s.earned, s.possible) }))
      : stats.flashRounds.length > 1
        ? stats.flashRounds.map((r, i, all) => ({ key: `flash-${r.round}`, label: t('common.round', { n: i + 1, total: all.length }), value: pct(r.earned, r.possible) }))
        : [];
  const full = stats.hearts.filter((h) => h === 'full').length;
  const half = stats.hearts.filter((h) => h === 'half').length;
  const summary = t(half > 0 ? 'results.stats.hearts.close' : 'results.stats.hearts', { full, total: stats.hearts.length, half });
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
              <Meter value={s.value} />
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
