import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { AVATAR_IDS } from '@/shared/game';
import { teamArtUrl } from '@/shared/Chrome';
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
    const avatarButtons = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-label') && (AVATAR_IDS as readonly string[]).includes(b.getAttribute('aria-label')!));
    expect(avatarButtons).toHaveLength(12);
  });

  it('each tile shows its team name and either its art (by id) or the placeholder initial', () => {
    mountGrid();
    for (const id of AVATAR_IDS) {
      const tile = screen.getByRole('button', { name: id });
      const name = fr[`team.${id}`];
      expect(tile).toHaveTextContent(name);
      const art = teamArtUrl(id, 512);
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
    // the only delivered art so far is the otters — resolved by id, no code naming it
    expect(teamArtUrl('otters', 512)).toContain('team-otters-idle-512');
  });

  it('team-name labels are the Inter label class (accents intact: É, not a display-font glyph)', () => {
    mountGrid();
    for (const id of AVATAR_IDS) {
      const tile = screen.getByRole('button', { name: id });
      const label = tile.querySelector('.cb-team-name');
      expect(label, `label for ${id}`).not.toBeNull();
      expect(label!.textContent).toBe(fr[`team.${id}`]);
    }
    expect(screen.getByText('Les Écureuils')).toBeInTheDocument();
    expect(screen.getByText('Les Ratons Laveurs')).toBeInTheDocument();
    expect(screen.getByText('Les Hermines')).toBeInTheDocument();
  });

  it('does not render any retired team', () => {
    mountGrid();
    for (const id of ['frogs', 'ducks', 'cats', 'pizzas', 'cocktails']) {
      expect(screen.queryByRole('button', { name: id })).toBeNull();
    }
    expect(screen.queryByText('Les Manchots')).toBeNull();
    expect(screen.getByText('Les Pingouins')).toBeInTheDocument();
  });
});
