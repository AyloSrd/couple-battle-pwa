import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { AVATAR_IDS } from '@/shared/game';
import { teamArtUrl } from '@/shared/Chrome';
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
    expect(PICKER_TEAMS).toEqual(['penguins', 'otters', 'lions', 'pandas', 'foxes', 'squirrels']);
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
    for (const id of ['frogs', 'ducks', 'cats', 'pizzas', 'cocktails', 'rabbits', 'bears', 'raccoons', 'mice', 'ermines', 'owls']) {
      expect(screen.queryByRole('button', { name: id })).toBeNull();
    }
    expect(screen.queryByText('Les Manchots')).toBeNull();
    expect(screen.getByText('Les Pingouins')).toBeInTheDocument();
  });
});
