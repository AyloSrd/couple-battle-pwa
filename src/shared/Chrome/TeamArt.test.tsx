import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamArt } from './TeamArt';

describe('TeamArt — teams whose art was retired (an old save may still reference them)', () => {
  it.each(['penguins', 'pandas'])('%s renders the placeholder initial in every variant, never an image', (id) => {
    const label = id === 'penguins' ? 'Les Pingouins' : 'Les Pandas';
    for (const variant of ['tile', 'avatar', 'avatarLg', 'hero'] as const) {
      const { container, unmount } = render(<TeamArt teamId={id} label={label} variant={variant} />);
      expect(container.querySelector('img'), `${id} ${variant}`).toBeNull();
      expect(container.textContent).toBe(label.charAt(0).toUpperCase());
      unmount();
    }
  });

  it('a current team renders its art in every variant', () => {
    for (const variant of ['tile', 'avatar', 'avatarLg', 'hero'] as const) {
      const { container, unmount } = render(<TeamArt teamId="raccoons" label="Les Ratons" variant={variant} />);
      expect(container.querySelector('img'), variant).not.toBeNull();
      unmount();
    }
  });
});
