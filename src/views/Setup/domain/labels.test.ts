import { describe, expect, it } from 'vitest';
import { duoLabel, pickTitle } from './labels';

describe('team-pick line halves', () => {
  it('splits at the colon', () => {
    expect(duoLabel('Duo 2 : choisissez votre équipe')).toBe('Duo 2');
    expect(pickTitle('Duo 2 : choisissez votre équipe')).toBe('choisissez votre équipe');
  });
  it('keeps the whole line when there is no colon', () => {
    expect(duoLabel('Pick a team')).toBe('Pick a team');
    expect(pickTitle('Pick a team')).toBe('Pick a team');
  });
});
