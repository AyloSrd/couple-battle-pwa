import { useEffect, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import { rankTeams, type TGameState } from '../domain/machine';

type TFinalScreenProps = {
  state: Extract<TGameState, { kind: 'final' }>;
  onRematch: () => void;
  onNewGame: () => void;
};

/** Crown finale. Plays the fanfare + confetti once on mount. */
export const FinalScreen: FC<TFinalScreenProps> = ({ state, onRematch, onNewGame }) => {
  const t = useT();
  const sound = useSoundApi();
  const ranked = rankTeams(state);
  const winner = ranked[0];

  useEffect(() => {
    sound.play('mus.fanfare');
    sound.play('sfx.confetti');
  }, [sound]);

  return (
    <>
      <div style={{ textAlign: 'center', display: 'grid', gap: 'var(--cb-s3)', justifyItems: 'center' }}>
        <Sprite name="ui-crown" size={48} />
        {winner && (
          <>
            <h1 className="cb-title">
              {t('results.winner', { team: t(`team.${winner.team.avatarId}` as TStringKey) })}
            </h1>
            <p className="cb-muted" style={{ margin: 0 }}>
              {t('results.winner.sub', {
                name1: winner.team.players[0],
                name2: winner.team.players[1],
              })}
            </p>
          </>
        )}
      </div>

      {ranked.map((row) => (
        <PixelPanel
          key={row.team.teamId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--cb-s3)',
            background: row.isWinner ? 'var(--cb-gold)' : undefined,
          }}
        >
          <Sprite name={`avatar-${row.team.avatarId}`} size={32} />
          <span style={{ flex: 1, fontSize: 'var(--cb-fs-small)' }}>
            {t(`team.${row.team.avatarId}` as TStringKey)}
          </span>
          {row.isWinner && <Sprite name="ui-crown" size={16} />}
          <strong className="cb-heading">{row.score}</strong>
        </PixelPanel>
      ))}

      <PixelButton variant="gold" block onClick={onRematch}>
        {t('results.rematch')}
      </PixelButton>
      <PixelButton variant="ghost" block onClick={onNewGame}>
        {t('results.newgame')}
      </PixelButton>
    </>
  );
};
