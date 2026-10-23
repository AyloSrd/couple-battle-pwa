import type { FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { PlayerAvatar, TeamArt } from '@/shared/Chrome';
import { actorOf, playerSlot } from '../domain/actor';
import type { TGameState } from '../domain/machine';
import '../actor.css';

type TProps = {
  state: TGameState;
  /**
   * card — a player's round bust + first name, centred on top of a question card
   * hero — a player's big bust (gates); for a couple just its names (the screen shows the hero art)
   * row  — a couple's compact portrait + team name + names
   */
  variant: 'card' | 'hero' | 'row';
  /** Gates whose title already carries the name can leave it out of the badge. */
  showName?: boolean;
};

/**
 * WHO ACTS on this screen (see `actorOf`): one player → their bust and name; a couple →
 * its portrait, team name and names; the whole table → nothing. Decorative art, real text.
 */
export const ActorBadge: FC<TProps> = ({ state, variant, showName = true }) => {
  const t = useT();
  const actor = actorOf(state);
  if (actor.kind === 'table') return null;
  const { team } = actor;
  const teamName = t(`team.${team.avatarId}` as TStringKey);

  if (actor.kind === 'player') {
    const name = team.players[actor.playerIdx];
    return (
      <span className={`cb-actor cb-actor--${variant === 'card' ? 'card' : 'hero'}`}>
        <PlayerAvatar teamId={team.avatarId} slot={playerSlot(actor.playerIdx)} name={name} teamLabel={teamName} />
        {showName && <span className="cb-actor-name">{name}</span>}
      </span>
    );
  }

  const names = `${team.players[0]} & ${team.players[1]}`;
  if (variant === 'hero') return <p className="cb-actor-names">{names}</p>;
  return (
    <span className="cb-actor cb-actor--row">
      <TeamArt teamId={team.avatarId} label={teamName} variant="avatar" />
      <span className="cb-actor-text">
        <span className="cb-actor-name">{teamName}</span>
        <span className="cb-actor-names">{names}</span>
      </span>
    </span>
  );
};
