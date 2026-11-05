import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PlayerAvatar, TeamArt } from '@/shared/Chrome';
import { actorOf, playerSlot } from '../domain/actor';
import type { TGame } from '@/shared/game';
import '../actor.css';

type TProps = {
  game: TGame;
  /** card: bust + name on a question card · hero: big bust (gates), a couple's names only ·
   *  row: a couple's portrait + team name + names */
  variant: 'card' | 'hero' | 'row';
  showName?: boolean; // gates whose title already carries the name leave it out
};

/** WHO ACTS on this screen (`actorOf`): a player, a couple, or nobody (the table). */
export const ActorBadge: FC<TProps> = ({ game, variant, showName = true }) => {
  const t = useT();
  const actor = actorOf(game);
  if (actor.kind === 'table') return null;
  const { team } = actor;
  const teamName = t(`team.${team.avatarId}`);
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
