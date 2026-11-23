import { describe, expect, it } from 'vitest';
import { en } from './strings.en';
import { es } from './strings.es';
import { fr } from './strings.fr';
import { it as italian } from './strings.it';

/**
 * P14 round 2: the result state of a choice card is also in its accessibility label ("Alex's answer", "Alex's guess"), so two new
 * keys, each with the player's `{name}` slot, in every language. (P15 adds Italian to the same table; `strings.test.ts` holds
 * the four files to the same key set and the same slots.)
 */

const KEYS = ['choice.answer', 'choice.guess'] as const;
const dictionaries: Record<string, Record<string, string>> = { fr, en, es, it: italian };
const slots = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();

describe('the accessibility strings of a choice card', () => {
  it.each(Object.entries(dictionaries))('%s has choice.answer and choice.guess, each with {name} and nothing else to fill', (_lang, dict) => {
    for (const key of KEYS) {
      expect({ key, value: typeof dict[key] }).toEqual({ key, value: 'string' });
      expect({ key, slots: slots(dict[key]!) }).toEqual({ key, slots: '{name}' });
    }
  });

  it('says two different things (the answer and the guess are not announced alike), in every language', () => {
    for (const dict of Object.values(dictionaries)) expect(dict['choice.answer']).not.toBe(dict['choice.guess']);
  });

  it('English reads "<name>\'s answer" and "<name>\'s guess"', () => {
    expect([en['choice.answer' as keyof typeof en], en['choice.guess' as keyof typeof en]]).toEqual(["{name}'s answer", "{name}'s guess"]);
  });
});
