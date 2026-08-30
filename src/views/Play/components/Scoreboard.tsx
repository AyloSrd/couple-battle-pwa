import { useEffect, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import { rankTeams, type TGameState } from '../domain/machine';

type TProps = {
  state: Extract<TGameState, { kind: 'scoreboard' }>;
  onNext: () => void;
};

/** V-Scoreboard — between-rounds standings. */
export const Scoreboard: FC<TProps> = ({ state, onNext }) => {
  const t = useT();
  const sound = useSoundApi();
  const ranked = rankTeams(state);
  const maxScore = Math.max(1, ...ranked.map((r) => r.score));
  const allTied = ranked.every((r) => r.isWinner);
  const leader = ranked[0];

  useEffect(() => {
    sound.play('sfx.point.exact');
  }, [sound]);

  return (
    <>
      <h1 className="cb-title">{t('score.title', { n: 1 })}</h1>

      {ranked.map((row) => (
        <PixelPanel key={row.team.teamId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--cb-s3)' }}>
          <Sprite name={`avatar-${row.team.avatarId}`} size={32} />
          {row.isWinner && !allTied && <Sprite name="ui-crown" size={16} />}
          <div style={{ flex: 1, height: 14, background: 'var(--cb-paper)', border: '2px solid var(--cb-ink)' }}>
            <div style={{ width: `${(row.score / maxScore) * 100}%`, height: '100%', background: 'var(--cb-gold)' }} />
          </div>
          <strong className="cb-heading">{row.score}</strong>
        </PixelPanel>
      ))}

      <p className="cb-muted" style={{ textAlign: 'center', margin: 0, fontSize: 'var(--cb-fs-small)' }}>
        {allTied
          ? t('score.tied')
          : leader
            ? t('score.leader', { team: t(`team.${leader.team.avatarId}` as TStringKey) })
            : ''}
      </p>

      <PixelButton variant="gold" block onClick={onNext}>
        {t('score.next')}
      </PixelButton>
    </>
  );
};
