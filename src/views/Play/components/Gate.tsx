import { useEffect, type FC } from 'react';
import { useT, type TFunc } from '@/shared/i18n';
import { useSound, type TSoundId } from '@/shared/sound';
import { PixelButton, Chip } from '@/shared/Chrome';
import type { TDispatch } from '../application/game';
import { actorOf } from '../domain/actor';
import type { TGameAt } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import '../flash.css';

type TGateCopy = {
  mod: 'sidegate' | 'passphone' | 'handoff'; // root class `cb-v-flash--{mod}`
  chip?: string;
  /** The actor's bust; `showName` when the title does not already carry the name. */
  badge?: { showName: boolean };
  title: string;
  heading: 'h1' | 'h2';
  sub?: string;
  cta: string;
  cue: TSoundId; // played once on mount
};

/** The "pass the phone" screens: the side gate (≥ 2 couples: answerers may consult, guessers must
 *  not look), the solo pass-phone (strict, before / after the secret) and the light handoff. */
function gateCopy(game: TGameAt<'gate' | 'handoff'>, t: TFunc): TGateCopy {
  const { step } = game;
  const actor = actorOf(game);
  const name = actor.kind === 'player' ? actor.team.players[actor.playerIdx] : '';
  const cta = t('pass.secret.confirm', { name });
  if (step.kind === 'handoff') {
    return { mod: 'handoff', badge: { showName: false }, title: t('flash.side.next', { name }), heading: 'h2', cta, cue: 'sfx.whoosh' };
  }
  const side = step.side;
  if (game.ctx.roster.length > 1) {
    const [chip, title, sub] = [t(`flash.side.chip.${side}`), t(`flash.side.${side}.title`), t(`flash.side.${side}.sub`)];
    return { mod: 'sidegate', chip, title, heading: 'h1', sub, cta: t('common.start'), cue: 'sfx.pass' };
  }
  if (side === 'answerers') {
    const team = actor.kind === 'player' ? t(`team.${actor.team.avatarId}`) : '';
    // the title already carries the name
    return { mod: 'passphone', badge: { showName: false }, title: t('pass.secret.title', { name }), heading: 'h1', sub: t('pass.secret.sub', { team }), cta, cue: 'sfx.pass' };
  }
  // the title has no name: the badge names the guesser
  return { mod: 'passphone', badge: { showName: true }, title: t('pass.back.title'), heading: 'h1', sub: t('pass.back.sub'), cta: t('pass.back.confirm'), cue: 'sfx.pass' };
}

/** One big hero, one big CTA. Mount with a `key` per gate so each plays its cue. */
export const Gate: FC<{ game: TGameAt<'gate' | 'handoff'>; dispatch: TDispatch }> = ({ game, dispatch }) => {
  const t = useT();
  const sound = useSound();
  const copy = gateCopy(game, t);
  const { cue } = copy;
  useEffect(() => {
    sound.play(cue);
  }, [sound, cue]);
  const handleConfirm = () => dispatch({ type: 'next' });

  return (
    <div className={`cb-v-flash cb-v-flash--${copy.mod}`}>
      <div className="cb-flash-hero">
        {copy.chip && <Chip className="cb-reveal-in">{copy.chip}</Chip>}
        {copy.badge && <ActorBadge game={game} variant="hero" showName={copy.badge.showName} />}
        {copy.heading === 'h1' ? <h1 className="cb-title">{copy.title}</h1> : <h2 className="cb-h2">{copy.title}</h2>}
        {copy.sub && <p className="cb-flash-sub">{copy.sub}</p>}
      </div>
      <PixelButton size="lg" onClick={handleConfirm}>
        {copy.cta}
      </PixelButton>
    </div>
  );
};
