import { useEffect, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { PixelButton } from '@/shared/Chrome';
import { actorOf } from '../domain/actor';
import type { TGameState } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import '../flash.css';

type TProps = {
  /** The next answerer takes the phone. */
  state: Extract<TGameState, { kind: 'handoff' }>;
  onConfirm: () => void;
};

/**
 * LIGHT handoff between answerers within the collection phase. The questions
 * are shared inside the answerers' group, so this is just "your turn, pass it
 * over" — deliberately NOT the strict no-peek pass-phone gate.
 */
export const Handoff: FC<TProps> = ({ state, onConfirm }) => {
  const t = useT();
  const sound = useSoundApi();
  const actor = actorOf(state);
  const name = actor.kind === 'player' ? actor.team.players[actor.playerIdx] : '';

  useEffect(() => {
    sound.play('sfx.whoosh');
  }, [sound]);

  return (
    <div className="cb-v-flash cb-v-flash--handoff">
      <div className="cb-flash-hero">
        <ActorBadge state={state} variant="hero" showName={false} />
        <h2 className="cb-h2">{t('flash.side.next', { name })}</h2>
      </div>
      <PixelButton onClick={onConfirm}>{t('pass.secret.confirm', { name })}</PixelButton>
    </div>
  );
};
