import { useEffect, type FC } from 'react';
import { useT, type TFunc, type TStringKey } from '@/shared/i18n';
import { useSound, type TSoundId } from '@/shared/sound';
import { PixelButton, Chip } from '@/shared/Chrome';
import type { TDispatch } from '../application/game';
import { actorOf } from '../domain/actor';
import type { TGameAt } from '../domain/machine';
import { ActorBadge } from './ActorBadge';
import '../flash.css';

/**
 * The three "pass the phone" screens, one per variant:
 *  - `side` — a GROUP gate at a Flash phase boundary ("sofa sides", ≥ 2 couples). The privacy
 *    boundary is between the groups: answerers may consult, guessers must not see the phone.
 *  - `passSecret` / `passBack` — solo has no group: the strict no-peek gate before (secret) / after (back) the
 *    answerer's secret input.
 *  - `handoff` — the LIGHT "your turn, pass it over" between answerers of one collection phase.
 */
type TGateVariant = 'side' | 'passSecret' | 'passBack' | 'handoff';

function gateVariantOf(game: TGameAt<'gate' | 'handoff'>): TGateVariant {
  if (game.step.kind === 'handoff') return 'handoff';
  if (game.ctx.roster.length > 1) return 'side';
  return game.step.side === 'answerers' ? 'passSecret' : 'passBack';
}

const SIDE_COPY = {
  answerers: { chip: 'flash.side.chip.answerers', title: 'flash.side.answerers.title', sub: 'flash.side.answerers.sub' },
  guessers: { chip: 'flash.side.chip.guessers', title: 'flash.side.guessers.title', sub: 'flash.side.guessers.sub' },
} as const satisfies Record<'answerers' | 'guessers', Record<'chip' | 'title' | 'sub', TStringKey>>;

type TGateCopy = {
  /** Root modifier: `cb-v-flash--{mod}`. */
  mod: 'sidegate' | 'passphone' | 'handoff';
  chip?: string;
  /** The actor's bust; `showName` when the title does not already carry the name. */
  badge?: { showName: boolean };
  title: string;
  /** Gates shout (h1); the handoff is a lighter h2. */
  heading: 'h1' | 'h2';
  sub?: string;
  cta: string;
  /** Played once on mount. */
  cue: TSoundId;
};

function gateCopy(game: TGameAt<'gate' | 'handoff'>, t: TFunc): TGateCopy {
  const variant = gateVariantOf(game);
  const actor = actorOf(game);
  const name = actor.kind === 'player' ? actor.team.players[actor.playerIdx] : '';
  switch (variant) {
    case 'side': {
      const keys = SIDE_COPY[game.step.kind === 'gate' ? game.step.side : 'answerers'];
      return { mod: 'sidegate', chip: t(keys.chip), title: t(keys.title), heading: 'h1', sub: t(keys.sub), cta: t('common.start'), cue: 'sfx.pass' };
    }
    case 'passSecret': {
      const team = actor.kind === 'player' ? t(`team.${actor.team.avatarId}`) : '';
      return {
        mod: 'passphone',
        badge: { showName: false }, // the title already carries the name
        title: t('pass.secret.title', { name }),
        heading: 'h1',
        sub: t('pass.secret.sub', { team }),
        cta: t('pass.secret.confirm', { name }),
        cue: 'sfx.pass',
      };
    }
    case 'passBack':
      return {
        mod: 'passphone',
        badge: { showName: true }, // the title has no name: the badge names the guesser
        title: t('pass.back.title'),
        heading: 'h1',
        sub: t('pass.back.sub'),
        cta: t('pass.back.confirm'),
        cue: 'sfx.pass',
      };
    case 'handoff':
      return {
        mod: 'handoff',
        badge: { showName: false },
        title: t('flash.side.next', { name }),
        heading: 'h2',
        cta: t('pass.secret.confirm', { name }),
        cue: 'sfx.whoosh',
      };
  }
}

type TProps = {
  game: TGameAt<'gate' | 'handoff'>;
  dispatch: TDispatch;
};

/** V-PassPhone / side gate / handoff — one big hero, one big CTA. Mount it with a `key` per
 *  gate so each one plays its cue. */
export const Gate: FC<TProps> = ({ game, dispatch }) => {
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
