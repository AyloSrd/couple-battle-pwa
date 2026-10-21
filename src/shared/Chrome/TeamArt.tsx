import type { FC } from 'react';
import { teamArtUrl } from './teamArtResolver';
import './chrome.css';

type TTeamArtProps = {
  /** Team (avatar) id from the registry. */
  teamId: string;
  /** Localized team name — its initial is the placeholder when no art exists. */
  label: string;
  /**
   * tile     — square portrait inside a setup tile (256 / 384 @2x)
   * avatar   — 44px face-crop of the portrait for score rows / chips (256)
   * avatarLg — 112px face-crop for gates / handoffs (256)
   * hero     — the big full-body slot: winner, active finale team (512, 2:3)
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
    // full body (2:3); a team with only a portrait still gets its portrait in the slot
    const url = teamArtUrl(teamId, 'full') ?? teamArtUrl(teamId, 'portrait', 384);
    if (!url) {
      return (
        <div className={['cb-char-placeholder', className ?? ''].filter(Boolean).join(' ')} aria-hidden="true">
          {initial}
        </div>
      );
    }
    return <img className={['cb-char', className ?? ''].filter(Boolean).join(' ')} src={url} alt="" draggable={false} />;
  }

  const small = teamArtUrl(teamId, 'portrait', 256);
  if (variant === 'tile') {
    const large = teamArtUrl(teamId, 'portrait', 384);
    return (
      <span className={['cb-team-art', className ?? ''].filter(Boolean).join(' ')}>
        {small ? (
          <img
            src={small}
            {...(large && large !== small ? { srcSet: `${small} 1x, ${large} 2x` } : {})}
            alt=""
            draggable={false}
          />
        ) : (
          <span className="cb-team-placeholder">{initial}</span>
        )}
      </span>
    );
  }

  // avatar / avatarLg — portrait, face crop
  return (
    <span
      className={['cb-avatar', variant === 'avatarLg' ? 'cb-avatar--lg' : '', className ?? ''].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {small ? <img src={small} alt="" draggable={false} /> : initial}
    </span>
  );
};
