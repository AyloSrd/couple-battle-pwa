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
  // first code point, not UTF-16 unit: an emoji-first name must not render half a surrogate pair
  const first = (text: string) => Array.from(text.trim())[0] ?? '';
  const initial = (first(name) || first(teamLabel) || first(teamId)).toUpperCase();
  return (
    <span className={['cb-player-avatar', className ?? ''].filter(Boolean).join(' ')} aria-hidden="true">
      {src ? <img src={src} alt="" draggable={false} /> : initial}
    </span>
  );
};
