import type { FC } from 'react';
import { playerArtUrl, type TPlayerSlot } from './teamArtResolver';
import './chrome.css';

type TPlayerAvatarProps = {
  /** Team (avatar) id from the registry. */
  teamId: string;
  /** Which of the couple's two characters (fixed art order). */
  slot: TPlayerSlot;
  /** Player name — its initial is the fallback when no art exists. */
  name: string;
  /** Team name — fallback initial when the player name is still empty. */
  teamLabel: string;
  className?: string;
};

/** Round bust of one player's character. Decorative: the field next to it carries the name. */
export const PlayerAvatar: FC<TPlayerAvatarProps> = ({ teamId, slot, name, teamLabel, className }) => {
  const src = playerArtUrl(teamId, slot);
  const initial = (name.trim().charAt(0) || teamLabel.trim().charAt(0) || teamId.charAt(0)).toUpperCase();
  return (
    <span className={['cb-player-avatar', className ?? ''].filter(Boolean).join(' ')} aria-hidden="true">
      {src ? <img src={src} alt="" draggable={false} /> : initial}
    </span>
  );
};
