import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { AVATAR_IDS } from '@/shared/game';
import { playerArtUrl, teamArtUrl, teamsWithArt } from '@/shared/Chrome';
import { fr } from '@/data/strings.fr';
import { initSetup, reduceSetup } from '../domain/machine';
import { PICKER_TEAMS } from '../domain/pickerTeams';
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
  it('renders exactly one tile per picker team (6, all on one page), none extra', () => {
    mountGrid();
    expect(PICKER_TEAMS).toEqual(['otters', 'lions', 'foxes', 'squirrels', 'raccoons', 'mice']);
    const tiles = PICKER_TEAMS.map((id) => screen.getByRole('button', { name: id }));
    expect(tiles).toHaveLength(6);
    const avatarButtons = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-label') && (AVATAR_IDS as readonly string[]).includes(b.getAttribute('aria-label')!));
    expect(avatarButtons).toHaveLength(6);
  });

  it('only offers registry teams, and leaves the registry itself untouched (12)', () => {
    for (const id of PICKER_TEAMS) expect(AVATAR_IDS).toContain(id);
    expect(AVATAR_IDS).toHaveLength(12);
  });

  it('each tile shows its team name and either its art (by id) or the placeholder initial', () => {
    mountGrid();
    for (const id of PICKER_TEAMS) {
      const tile = screen.getByRole('button', { name: id });
      const name = fr[`team.${id}`];
      expect(tile).toHaveTextContent(name);
      const art = teamArtUrl(id, 'portrait', 256);
      const img = tile.querySelector('.cb-team-art img');
      const placeholder = tile.querySelector('.cb-team-placeholder');
      if (art) {
        expect(img?.getAttribute('src'), `${id} art`).toBe(art);
        expect(placeholder).toBeNull();
      } else {
        expect(img).toBeNull();
        expect(placeholder?.textContent, `${id} placeholder`).toBe(name.charAt(0).toUpperCase());
      }
    }
    // art is resolved by id, no code naming a team
    expect(teamArtUrl('otters', 'portrait', 256)).toContain('team-otters-256');
  });

  it('team-name labels are the Inter label class (accents intact: É, not a display-font glyph)', () => {
    mountGrid();
    for (const id of PICKER_TEAMS) {
      const tile = screen.getByRole('button', { name: id });
      const label = tile.querySelector('.cb-team-name');
      expect(label, `label for ${id}`).not.toBeNull();
      expect(label!.textContent).toBe(fr[`team.${id}`]);
    }
    expect(screen.getByText('Les Écureuils')).toBeInTheDocument();
  });

  it('does not render any retired or not-yet-delivered team', () => {
    mountGrid();
    for (const id of ['frogs', 'ducks', 'cats', 'pizzas', 'cocktails', 'rabbits', 'bears', 'ermines', 'owls']) {
      expect(screen.queryByRole('button', { name: id })).toBeNull();
    }
    expect(screen.queryByText('Les Manchots')).toBeNull();
  });

  it('penguins and pandas are not in the picker and resolve to NO art (no fallback to old art)', () => {
    mountGrid();
    for (const id of ['penguins', 'pandas']) {
      expect(PICKER_TEAMS as readonly string[]).not.toContain(id);
      expect(screen.queryByRole('button', { name: id })).toBeNull();
      expect(teamArtUrl(id, 'portrait')).toBeUndefined();
      expect(teamArtUrl(id, 'portrait', 256)).toBeUndefined();
      expect(teamArtUrl(id, 'full')).toBeUndefined();
      expect(playerArtUrl(id, 1)).toBeUndefined();
      expect(playerArtUrl(id, 2)).toBeUndefined();
    }
  });

  it('the picker offers exactly the teams that have art (art without a tile, or a tile without art, fails here)', () => {
    expect([...PICKER_TEAMS].sort()).toEqual([...teamsWithArt()].sort());
  });

  it('all six picker teams resolve portrait (256 + 384), full body and both busts', () => {
    for (const id of PICKER_TEAMS) {
      expect(teamArtUrl(id, 'portrait', 256), `${id} 256`).toContain(`team-${id}-256`);
      expect(teamArtUrl(id, 'portrait', 384), `${id} 384`).toContain(`team-${id}-384`);
      expect(teamArtUrl(id, 'full'), `${id} full`).toContain(`team-${id}-full-512`);
      expect(playerArtUrl(id, 1), `${id} p1`).toContain(`team-${id}-p1-192`);
      expect(playerArtUrl(id, 2), `${id} p2`).toContain(`team-${id}-p2-192`);
    }
  });
});
