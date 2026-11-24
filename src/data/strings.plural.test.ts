import { describe, expect, it } from 'vitest';
import { fr } from './strings.fr';
import { en } from './strings.en';
import { es } from './strings.es';
import { it as italian } from './strings.it';

/**
 * Every team name is plural in French, English and Spanish ("Les Loutres", "The Otters", "Las Nutrias"), so the two sentences
 * that take a team as subject must use a plural verb. Italian ("Vittoria per {team}!", "In testa: {team}!") has no verb to agree and stays as is.
 */
const dicts = { fr, en, es } as Record<string, Record<string, string>>;
const teamNames = (lang: string) => Object.entries(dicts[lang] ?? {}).filter(([key]) => key.startsWith('team.')).map(([, value]) => value);

describe('plural verbs after a team name', () => {
  it('pins the six sentences', () => {
    expect(fr['results.winner']).toBe('👑 Victoire pour {team} !');
    expect(fr['score.leader']).toBe('{team} mènent la danse !');
    expect(en['results.winner']).toBe('👑 {team} win the battle!');
    expect(en['score.leader']).toBe('{team} lead the pack!');
    expect(es['results.winner']).toBe('👑 ¡{team} ganan la batalla!');
    expect(es['score.leader']).toBe('¡{team} van a la cabeza!');
  });

  it('keeps Italian unchanged', () => {
    expect(italian['results.winner']).toBe('👑 Vittoria per {team}!');
    expect(italian['score.leader']).toBe('In testa: {team}!');
  });

  it.each([
    ['fr', /^Les /],
    ['en', /^The /],
    ['es', /^(Los|Las) /],
  ])('%s: all 12 team names start with a plural article', (lang, article) => {
    const names = teamNames(lang);
    expect(names).toHaveLength(12);
    for (const name of names) expect(name).toMatch(article);
  });

  it('en: every team name is a plural noun (ends with "s", or is "The Mice")', () => {
    for (const name of teamNames('en')) expect(name === 'The Mice' || /s$/.test(name)).toBe(true);
  });

  it('so the sentences carry no singular verb', () => {
    for (const key of ['results.winner', 'score.leader']) {
      expect(dicts.fr?.[key]).not.toMatch(/remporte\b(?!nt)|mène\b(?!nt)/i);
      expect(dicts.en?.[key]).not.toMatch(/\b(wins|leads)\b/i);
      expect(dicts.es?.[key]).not.toMatch(/\bgana\b|\bva\b/i);
    }
  });
});
