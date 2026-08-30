import { useEffect, useState, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import { rankTeams, type TGameState } from '../domain/machine';

type TConfetto = { left: number; delay: number; shape: number };

const Confetti: FC = () => {
  const [pieces] = useState<TConfetto[]>(() =>
    Array.from({ length: 14 }, (_, i) => ({
      left: Math.round(Math.random() * 100),
      delay: Math.round(Math.random() * 1200),
      shape: (i % 4) + 1,
    })),
  );
  return (
    <div aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="cb-confetti"
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}ms` }}
        >
          <Sprite name={`ui-confetti-${p.shape}`} size={12} />
        </span>
      ))}
    </div>
  );
};

/** Solo record outcome (only for a 1-couple game). */
export type TSoloResult = { isBest: boolean; points: number; best: number };

type TFinalScreenProps = {
  state: Extract<TGameState, { kind: 'final' }>;
  onRematch: () => void;
  onNewGame: () => void;
  solo?: TSoloResult | undefined;
};

/** Crown finale. Plays the fanfare + confetti once on mount. */
export const FinalScreen: FC<TFinalScreenProps> = ({ state, onRematch, onNewGame, solo }) => {
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
      <Confetti />
      <div style={{ textAlign: 'center', display: 'grid', gap: 'var(--cb-s3)', justifyItems: 'center' }}>
        <Sprite name="ui-crown" size={48} />
        {solo ? (
          <h1 className="cb-title">
            {solo.isBest
              ? t('results.solo.newBest', { points: solo.points })
              : t('results.solo.notBest', { points: solo.points, best: solo.best })}
          </h1>
        ) : (
          winner && (
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
          )
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
