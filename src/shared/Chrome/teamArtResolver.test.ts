import { describe, expect, it } from 'vitest';
import { AVATAR_IDS } from '@/shared/game';
import { teamArtUrl, teamsWithArt } from './teamArtResolver';

// every team-*.webp the bundler knows about (same glob the resolver uses)
const FILES = Object.keys(import.meta.glob('/src/assets/art/team-*.webp', { eager: true, query: '?url' }));

describe('teamArtResolver', () => {
  it('every shipped file is a portrait (256|384) or a full body (full-512) of a registry team', () => {
    expect(FILES.length).toBeGreaterThan(0);
    for (const path of FILES) {
      const m = /team-([a-z0-9]+)-(?:full-512|256|384)\.webp$/.exec(path);
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
});
