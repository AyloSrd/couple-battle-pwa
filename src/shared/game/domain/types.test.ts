import { describe, expect, it } from 'vitest';
import { AVATAR_IDS, ZAvatarIdSchema } from './types';
import { teamArtUrl, teamsWithArt } from '@/shared/Chrome';
import { fr } from '@/data/strings.fr';
import { en } from '@/data/strings.en';

const CANON = [
  'penguins', 'otters', 'lions', 'pandas', 'foxes', 'squirrels',
  'rabbits', 'bears', 'raccoons', 'mice', 'ermines', 'owls',
] as const;
const RETIRED = ['frogs', 'ducks', 'cats', 'pizzas', 'cocktails'] as const;

describe('team registry (AVATAR_IDS)', () => {
  it('has exactly the 12 canonical teams, in roster order', () => {
    expect(AVATAR_IDS).toHaveLength(12);
    expect([...AVATAR_IDS]).toEqual([...CANON]);
    expect(new Set(AVATAR_IDS).size).toBe(12); // no duplicates
  });

  it('every team has a team.<id> string in BOTH locales', () => {
    for (const id of AVATAR_IDS) {
      expect(fr, `fr team.${id}`).toHaveProperty(`team.${id}`);
      expect(en, `en team.${id}`).toHaveProperty(`team.${id}`);
      expect((fr as Record<string, string>)[`team.${id}`]).not.toBe('');
      expect((en as Record<string, string>)[`team.${id}`]).not.toBe('');
    }
  });

  it('every team resolves to character art by id or to the placeholder (never a missing file)', () => {
    for (const id of AVATAR_IDS) {
      const art = teamArtUrl(id, 512);
      if (art) expect(art).toMatch(new RegExp(`team-${id}-idle-(512|768)\\.webp`));
      else expect(art).toBeUndefined(); // → placeholder tile (tinted square + initial)
    }
    // every shipped render belongs to a registry team (no orphan art)
    for (const id of teamsWithArt()) expect((AVATAR_IDS as readonly string[]).includes(id)).toBe(true);
  });

  it('retired teams are gone: not in the registry, no string, no art, schema rejects them', () => {
    for (const id of RETIRED) {
      expect((AVATAR_IDS as readonly string[]).includes(id)).toBe(false);
      expect(fr).not.toHaveProperty(`team.${id}`);
      expect(en).not.toHaveProperty(`team.${id}`);
      expect(teamArtUrl(id, 512)).toBeUndefined();
      expect(ZAvatarIdSchema.safeParse(id).success).toBe(false);
    }
  });

  it('team.penguins is "Les Pingouins" now (no "Manchots" left in either locale)', () => {
    expect(fr['team.penguins']).toBe('Les Pingouins');
    for (const value of Object.values({ ...fr, ...en } as Record<string, string>)) {
      if (value.includes('Manchots')) {
        // Only the designer sprite-note may still say it (upstream owns that copy).
        const key = Object.keys(en as Record<string, string>).find((k) => (en as Record<string, string>)[k] === value);
        expect(key?.startsWith('spr.'), `"Manchots" leaked into player-facing copy: ${key}`).toBe(true);
      }
    }
  });
});
