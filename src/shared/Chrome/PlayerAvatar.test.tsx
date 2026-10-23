import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerAvatar } from './PlayerAvatar';
import { playerArtUrl } from './teamArtResolver';

describe('PlayerAvatar', () => {
  it('shows the single 192 bust, decorative, when art exists', () => {
    const { container } = render(<PlayerAvatar teamId="otters" slot={2} name="Léo" teamLabel="Loutres" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    const img = root.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img?.getAttribute('src')).toBe(playerArtUrl('otters', 2));
    expect(img).not.toHaveAttribute('srcset');
    expect(root.textContent).toBe('');
  });

  it('slots 1 and 2 resolve to different art', () => {
    const a = render(<PlayerAvatar teamId="lions" slot={1} name="" teamLabel="Lions" />);
    const b = render(<PlayerAvatar teamId="lions" slot={2} name="" teamLabel="Lions" />);
    expect(a.container.querySelector('img')?.getAttribute('src')).not.toBe(
      b.container.querySelector('img')?.getAttribute('src'),
    );
  });

  it('falls back to the player initial, then the team initial, when no art exists', () => {
    const named = render(<PlayerAvatar teamId="no-such-team" slot={1} name="  zoé" teamLabel="Fantômes" />);
    expect(named.container.querySelector('img')).toBeNull();
    expect(named.container.firstElementChild).toHaveTextContent('Z');
    const empty = render(<PlayerAvatar teamId="no-such-team" slot={2} name=" " teamLabel="fantômes" />);
    expect(empty.container.firstElementChild).toHaveTextContent('F');
    expect(empty.container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes the first code point as the initial, so an emoji-first name is not split', () => {
    const { container } = render(<PlayerAvatar teamId="no-such-team" slot={1} name="🦊 Zoé" teamLabel="Fantômes" />);
    expect(container.firstElementChild?.textContent).toBe('🦊');
  });
});
