import { describe, expect, it } from 'vitest';
import { splitPickLine } from './labels';

describe('team-pick line halves', () => {
  it('splits at the colon', () => {
    expect(splitPickLine('Duo 2 : choisissez votre équipe')).toEqual(['Duo 2', 'choisissez votre équipe']);
  });
  it('keeps the whole line when there is no colon', () => {
    expect(splitPickLine('Pick a team')).toEqual(['Pick a team', 'Pick a team']);
  });
});
