import { describe, expect, it } from 'vitest';
import { AVATAR_IDS } from '@/shared/game/domain/types';
import { fr } from '@/data/strings.fr';
import { interpolate, teamKey } from './services';

describe('interpolate', () => {
  it('replaces a single placeholder', () => {
    expect(interpolate('Salut {name} !', { name: 'Morgane' })).toBe('Salut Morgane !');
  });

  it('replaces multiple and repeated placeholders', () => {
    expect(interpolate('{n}/{total} — {n} done', { n: 2, total: 5 })).toBe('2/5 — 2 done');
  });

  it('coerces numbers to strings', () => {
    expect(interpolate('+{points} pts', { points: 2 })).toBe('+2 pts');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('Hi {name}', { other: 'x' })).toBe('Hi {name}');
  });

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'ignores prototype keys: {%s} stays an unknown slot',
    (key) => {
      expect(interpolate(`Hi {${key}}`, { name: 'x' })).toBe(`Hi {${key}}`);
      expect(interpolate(`Hi {${key}}`, {})).toBe(`Hi {${key}}`);
    },
  );

  it('still fills an own key that shares a prototype name', () => {
    expect(interpolate('{constructor}', { constructor: 'ok' })).toBe('ok');
  });

  it('is a no-op without vars', () => {
    expect(interpolate('plain text')).toBe('plain text');
  });
});

describe('teamKey', () => {
  it('names every avatar with an existing team string', () => {
    for (const id of AVATAR_IDS) expect(fr[teamKey(id)]).toBeTruthy();
    expect(teamKey('otters')).toBe('team.otters');
  });
});
