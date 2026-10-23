import { describe, expect, it } from 'vitest';
import { AVATAR_IDS } from '@/shared/game';
import { playerArtUrl, teamArtUrl, teamsWithArt } from './teamArtResolver';

// every team-*.webp the bundler knows about (same glob the resolver uses)
const FILES = Object.keys(import.meta.glob('/src/assets/art/team-*.webp', { eager: true, query: '?url' }));

describe('teamArtResolver', () => {
  it('every shipped file is a portrait (256|384), a full body (full-512) or a player bust (p1|p2-192) of a registry team', () => {
    expect(FILES.length).toBeGreaterThan(0);
    for (const path of FILES) {
      const m = /team-([a-z0-9]+)-(?:full-512|256|384|p[12]-192)\.webp$/.exec(path);
      expect(m, path).not.toBeNull();
      expect((AVATAR_IDS as readonly string[]).includes(m?.[1] ?? ''), `${path} orphan art`).toBe(true);
    }
  });

  it('a full-body file is never parsed as a portrait (and vice versa)', () => {
    for (const id of teamsWithArt()) {
      const portrait = teamArtUrl(id, 'portrait');
      const full = teamArtUrl(id, 'full');
      expect(portrait, id).toBeDefined();
      expect(portrait).not.toContain('-full-');
      expect(portrait).toMatch(new RegExp(`team-${id}-(256|384)`));
      if (full) expect(full).toMatch(new RegExp(`team-${id}-full-512`));
    }
  });

  it('teamsWithArt lists portrait ids only, each a registry team, no duplicates', () => {
    const ids = teamsWithArt();
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect((AVATAR_IDS as readonly string[]).includes(id)).toBe(true);
      expect(FILES.some((f) => new RegExp(`team-${id}-(256|384)\\.webp$`).test(f))).toBe(true);
    }
  });

  it('falls back to the nearest shipped size, then to undefined for an unknown team', () => {
    const [id] = teamsWithArt();
    expect(id).toBeDefined();
    expect(teamArtUrl(id as string, 'portrait', 256)).toMatch(/-256/);
    expect(teamArtUrl(id as string, 'portrait', 384)).toMatch(/-384/);
    expect(teamArtUrl(id as string, 'portrait')).toMatch(/-384/); // default = largest
    expect(teamArtUrl('no-such-team', 'portrait')).toBeUndefined();
    expect(teamArtUrl('no-such-team', 'full')).toBeUndefined();
  });

  it('ships art for exactly the six current teams; penguins/pandas have none and the old files are gone', () => {
    expect([...teamsWithArt()].sort()).toEqual(['foxes', 'lions', 'mice', 'otters', 'raccoons', 'squirrels']);
    expect(FILES.filter((f) => /team-(penguins|pandas)-/.test(f))).toEqual([]);
    for (const id of ['penguins', 'pandas']) {
      expect(teamArtUrl(id, 'portrait')).toBeUndefined();
      expect(teamArtUrl(id, 'full')).toBeUndefined();
      expect(playerArtUrl(id, 1)).toBeUndefined();
      expect(playerArtUrl(id, 2)).toBeUndefined();
    }
    for (const id of teamsWithArt()) {
      expect(teamArtUrl(id, 'portrait', 256)).toMatch(new RegExp(`team-${id}-256`));
      expect(teamArtUrl(id, 'portrait', 384)).toMatch(new RegExp(`team-${id}-384`));
      expect(teamArtUrl(id, 'full')).toMatch(new RegExp(`team-${id}-full-512`));
      expect(playerArtUrl(id, 1)).toMatch(new RegExp(`team-${id}-p1-192`));
      expect(playerArtUrl(id, 2)).toMatch(new RegExp(`team-${id}-p2-192`));
    }
  });

  describe('player busts', () => {
    const ids = AVATAR_IDS.filter((id) => playerArtUrl(id, 1) !== undefined);

    it('ships both slots at 192 for every picker team, distinct per slot', () => {
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        for (const slot of [1, 2] as const) {
          expect(playerArtUrl(id, slot), `${id} p${slot}`).toMatch(new RegExp(`team-${id}-p${slot}-192`));
        }
        expect(playerArtUrl(id, 1)).not.toBe(playerArtUrl(id, 2));
      }
    });

    it('a player file is never parsed as a portrait or a full body, and vice versa', () => {
      for (const id of ids) {
        // portrait / full resolve to their own files only, never a -pN- one
        expect(teamArtUrl(id, 'portrait')).not.toMatch(/-p[12]-/);
        expect(teamArtUrl(id, 'full') ?? '').not.toMatch(/-p[12]-/);
        for (const slot of [1, 2] as const) {
          expect(playerArtUrl(id, slot)).not.toMatch(/-full-|-(256|384|512)\./);
        }
      }
      // teamsWithArt stays portrait-only (a team with busts but no portrait is not listed)
      for (const id of teamsWithArt()) expect(teamArtUrl(id, 'portrait')).toBeDefined();
    });

    it('the three naming patterns are mutually exclusive on every shipped file', () => {
      const portrait = /team-([a-z0-9]+)-(\d+)\.webp$/;
      const full = /team-([a-z0-9]+)-full-(\d+)\.webp$/;
      const player = /team-([a-z0-9]+)-p([12])-192\.webp$/;
      for (const path of FILES) {
        const hits = [portrait, full, player].filter((re) => re.test(path));
        expect(hits, path).toHaveLength(1);
      }
      // a player name can't satisfy the portrait or full pattern, even on adversarial ids
      expect(portrait.test('team-otters-p1-192.webp')).toBe(false);
      expect(full.test('team-otters-p1-192.webp')).toBe(false);
      expect(player.test('team-otters-256.webp')).toBe(false);
      expect(player.test('team-otters-full-512.webp')).toBe(false);
    });

    it('missing art (unknown team or slot) resolves to undefined', () => {
      expect(playerArtUrl('no-such-team', 1)).toBeUndefined();
      expect(playerArtUrl('no-such-team', 2)).toBeUndefined();
      expect(playerArtUrl('otters', 3 as unknown as 1)).toBeUndefined();
    });
  });
});
