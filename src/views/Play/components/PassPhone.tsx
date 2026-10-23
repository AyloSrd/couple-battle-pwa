import { useEffect, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton } from '@/shared/Chrome';
import { actorOf } from '../domain/actor';
import type { TGameState } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import '../flash.css';

type TProps = {
  variant: 'secret' | 'back';
  /** Solo only: `sideAnswerers` (the answerer takes the phone) or `sideGuessers` (the guesser does). */
  state: Extract<TGameState, { kind: 'sideAnswerers' | 'sideGuessers' }>;
  onConfirm: () => void;
};

/** V-PassPhone — privacy gate before/after secret input. */
export const PassPhone: FC<TProps> = ({ variant, state, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();

  useEffect(() => {
    sound.play('sfx.pass');
  }, [sound]);

  const isSecret = variant === 'secret';
  const actor = actorOf(state);
  const name = actor.kind === 'player' ? actor.team.players[actor.playerIdx] : '';
  const teamName = actor.kind === 'player' ? t(`team.${actor.team.avatarId}` as TStringKey) : '';

  return (
    <div className="cb-v-flash cb-v-flash--passphone">
      <div className="cb-flash-hero">
        {/* the secret title already carries the name; the back gate has none, so the badge names the guesser */}
        <ActorBadge state={state} variant="hero" showName={!isSecret} />
        <h1 className="cb-title">
          {isSecret ? t('pass.secret.title', { name }) : t('pass.back.title')}
        </h1>
        <p className="cb-flash-sub">
          {isSecret ? t('pass.secret.sub', { team: teamName }) : t('pass.back.sub')}
        </p>
      </div>
      <PixelButton onClick={onConfirm}>
        {isSecret ? t('pass.secret.confirm', { name }) : t('pass.back.confirm')}
      </PixelButton>
    </div>
  );
};
