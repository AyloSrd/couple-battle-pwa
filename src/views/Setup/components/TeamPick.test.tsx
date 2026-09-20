import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { AVATAR_IDS } from '@/shared/game';
import { fr } from '@/data/strings.fr';
import { initSetup, reduceSetup } from '../domain/machine';
import { TeamPick } from './TeamPick';

function mountGrid() {
  const state = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
  return render(
    <LangProvider initialLang="fr">
      <SoundApiProvider api={createSoundNoopApi()}>
        <TeamPick state={state} onSelect={vi.fn()} onNext={vi.fn()} />
      </SoundApiProvider>
    </LangProvider>,
  );
}

describe('V-Setup Step A — team grid', () => {
  it('renders exactly one tile per registry team (12), none extra', () => {
    mountGrid();
    const tiles = AVATAR_IDS.map((id) => screen.getByRole('button', { name: id }));
    expect(tiles).toHaveLength(12);
    // no stray tile: every avatar-labelled button is a registry id
    const avatarButtons = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-label') && (AVATAR_IDS as readonly string[]).includes(b.getAttribute('aria-label')!));
    expect(avatarButtons).toHaveLength(12);
  });

  it('each tile shows its team name from the strings and its avatar sprite', () => {
    mountGrid();
    for (const id of AVATAR_IDS) {
      const tile = screen.getByRole('button', { name: id });
      expect(tile).toHaveTextContent(fr[`team.${id}`]);
      expect(tile.querySelector('img')?.getAttribute('src')).toContain(`avatar-${id}.svg`);
    }
  });

  it('does not render any retired team', () => {
    mountGrid();
    for (const id of ['frogs', 'ducks', 'cats', 'pizzas', 'cocktails']) {
      expect(screen.queryByRole('button', { name: id })).toBeNull();
    }
    expect(screen.queryByText('Les Manchots')).toBeNull();
    expect(screen.getByText('Les Pingouins')).toBeInTheDocument();
  });

  it('team-name labels use the BODY font and keep their accents intact (É, not a shrunken pixel glyph)', () => {
    mountGrid();
    for (const id of AVATAR_IDS) {
      const tile = screen.getByRole('button', { name: id });
      const label = [...tile.querySelectorAll('span')].find((s) => s.textContent === fr[`team.${id}`]);
      expect(label, `label for ${id}`).toBeDefined();
      // explicit body font on the label — the surrounding .cb-btn is the pixel display font
      expect(label!.style.fontFamily).toBe('var(--cb-font-body)');
    }
    // the accented names come through exactly as in the string data
    expect(screen.getByText('Les Écureuils')).toBeInTheDocument();
    expect(screen.getByText('Les Ratons Laveurs')).toBeInTheDocument();
    expect(screen.getByText('Les Hermines')).toBeInTheDocument();
  });
});
