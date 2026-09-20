import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AVATAR_IDS, ZAvatarIdSchema } from './types';
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

  it('every team has a resolvable avatar-<id>.svg sprite shipped with the app', () => {
    for (const id of AVATAR_IDS) {
      const file = resolve(process.cwd(), 'public/sprites', `avatar-${id}.svg`);
      expect(existsSync(file), `missing sprite ${file}`).toBe(true);
    }
  });

  it('retired teams are gone: not in the registry, no string, no sprite, schema rejects them', () => {
    for (const id of RETIRED) {
      expect((AVATAR_IDS as readonly string[]).includes(id)).toBe(false);
      expect(fr).not.toHaveProperty(`team.${id}`);
      expect(en).not.toHaveProperty(`team.${id}`);
      expect(existsSync(resolve(process.cwd(), 'public/sprites', `avatar-${id}.svg`))).toBe(false);
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
