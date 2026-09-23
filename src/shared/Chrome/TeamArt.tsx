import type { FC } from 'react';
import { teamArtUrl } from './teamArtResolver';
import './chrome.css';

type TTeamArtProps = {
  /** Team (avatar) id from the registry. */
  teamId: string;
  /** Localized team name — its initial is the placeholder when no art exists. */
  label: string;
  /**
   * tile   — square art area inside a setup tile (512)
   * avatar — 40px face-crop for score rows / chips (512, object-position on the face)
   * avatarLg — 96px face-crop for gates / handoffs
   * hero   — the big character slot: Home, winner, active finale team (768)
   */
  variant: 'tile' | 'avatar' | 'avatarLg' | 'hero';
  className?: string;
};

function initialOf(label: string, teamId: string): string {
  const ch = label.trim().charAt(0) || teamId.charAt(0);
  return ch.toUpperCase();
}

/** Team character art by id, with the placeholder (tinted tile + initial) fallback. */
export const TeamArt: FC<TTeamArtProps> = ({ teamId, label, variant, className }) => {
  const initial = initialOf(label, teamId);

  if (variant === 'hero') {
    const url = teamArtUrl(teamId, 768);
    if (!url) {
      return (
        <div className={['cb-char-placeholder', className ?? ''].filter(Boolean).join(' ')} aria-hidden="true">
          {initial}
        </div>
      );
    }
    const small = teamArtUrl(teamId, 512);
    return (
      <img
        className={['cb-char', className ?? ''].filter(Boolean).join(' ')}
        src={url}
        {...(small && small !== url ? { srcSet: `${small} 1x, ${url} 2x` } : {})}
        alt=""
        draggable={false}
      />
    );
  }

  const url = teamArtUrl(teamId, 512);
  if (variant === 'tile') {
    return (
      <span className={['cb-team-art', className ?? ''].filter(Boolean).join(' ')}>
        {url ? <img src={url} alt="" draggable={false} /> : <span className="cb-team-placeholder">{initial}</span>}
      </span>
    );
  }

  // avatar / avatarLg
  return (
    <span
      className={['cb-avatar', variant === 'avatarLg' ? 'cb-avatar--lg' : '', className ?? ''].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" draggable={false} /> : initial}
    </span>
  );
};
