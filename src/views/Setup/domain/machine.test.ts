import { describe, expect, it } from 'vitest';
import type { TAvatarId } from '@/shared/game/domain/types';
import {
  initSetup,
  reduceSetup,
  takenAvatars,
  isLastCouple,
  hasDuplicateName,
  type TSetupState,
} from './machine';

/** Drive a full couple (avatar + two names) from a TEAM step. */
function buildCouple(
  state: TSetupState,
  avatarId: TAvatarId,
  n1: string,
  n2: string,
): TSetupState {
  let s = reduceSetup(state, { type: 'selectAvatar', avatarId });
  s = reduceSetup(s, { type: 'confirmTeam' });
  s = reduceSetup(s, { type: 'setName', which: 1, value: n1 });
  s = reduceSetup(s, { type: 'setName', which: 2, value: n2 });
  return reduceSetup(s, { type: 'confirmNames' });
}

describe('setup wizard — count step', () => {
  it('starts on the count step with nothing chosen', () => {
    const s = initSetup();
    expect(s.step).toBe('count');
    expect(s.count).toBeNull();
    expect(s.teams).toEqual([]);
  });

  it('picking a count opens the first TEAM step', () => {
    const s = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
    expect(s.step).toBe('team');
    expect(s.count).toBe(2);
    expect(s.coupleIdx).toBe(0);
  });
});

describe('setup wizard — TEAM step (select, not advance)', () => {
  const start = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });

  it('tapping a free avatar selects it WITHOUT advancing', () => {
    const s = reduceSetup(start, { type: 'selectAvatar', avatarId: 'otters' });
    expect(s.avatar).toBe('otters');
    expect(s.step).toBe('team'); // no auto-advance
  });

  it('re-tapping another free avatar moves the selection', () => {
    let s = reduceSetup(start, { type: 'selectAvatar', avatarId: 'otters' });
    s = reduceSetup(s, { type: 'selectAvatar', avatarId: 'lions' });
    expect(s.avatar).toBe('lions');
    expect(s.step).toBe('team');
  });

  it('confirmTeam is a no-op until an avatar is selected (Next stays disabled)', () => {
    const s = reduceSetup(start, { type: 'confirmTeam' });
    expect(s.step).toBe('team');
    expect(s).toEqual(start);
  });

  it('confirmTeam advances to NAMES once an avatar is selected', () => {
    let s = reduceSetup(start, { type: 'selectAvatar', avatarId: 'otters' });
    s = reduceSetup(s, { type: 'confirmTeam' });
    expect(s.step).toBe('names');
  });

  it('a taken avatar is non-selectable and keeps the current selection', () => {
    // couple 0 takes 'otters', now on couple 1's TEAM
    const s0 = buildCouple(start, 'otters', 'A', 'B');
    const passed = reduceSetup(s0, { type: 'confirmPass' }); // → couple 1 TEAM
    expect(takenAvatars(passed).has('otters')).toBe(true);

    const withPick = reduceSetup(passed, { type: 'selectAvatar', avatarId: 'lions' });
    const tapTaken = reduceSetup(withPick, { type: 'selectAvatar', avatarId: 'otters' });
    expect(tapTaken.avatar).toBe('lions'); // selection unchanged
  });
});

describe('setup wizard — NAMES validation per step', () => {
  const onNames = (() => {
    let s = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
    s = reduceSetup(s, { type: 'selectAvatar', avatarId: 'otters' });
    return reduceSetup(s, { type: 'confirmTeam' });
  })();

  it('blocks with "required" when a name is empty', () => {
    let s = reduceSetup(onNames, { type: 'setName', which: 1, value: 'Luca' });
    s = reduceSetup(s, { type: 'confirmNames' }); // name2 still empty
    expect(s.error).toBe('required');
    expect(s.step).toBe('names');
  });

  it('blocks with "duplicate" on a same-couple repeat (trim + case-insensitive)', () => {
    let s = reduceSetup(onNames, { type: 'setName', which: 1, value: 'Luca' });
    s = reduceSetup(s, { type: 'setName', which: 2, value: ' luca ' });
    s = reduceSetup(s, { type: 'confirmNames' });
    expect(s.error).toBe('duplicate');
    expect(s.step).toBe('names');
  });

  it('blocks a duplicate across couples (whole roster)', () => {
    const start = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
    const c0 = buildCouple(start, 'otters', 'Luca', 'Morgane');
    const onTeam1 = reduceSetup(c0, { type: 'confirmPass' });
    let s = reduceSetup(onTeam1, { type: 'selectAvatar', avatarId: 'lions' });
    s = reduceSetup(s, { type: 'confirmTeam' });
    s = reduceSetup(s, { type: 'setName', which: 1, value: 'Alex' });
    s = reduceSetup(s, { type: 'setName', which: 2, value: 'MORGANE' });
    s = reduceSetup(s, { type: 'confirmNames' });
    expect(s.error).toBe('duplicate');
  });

  it('editing a name clears a standing error', () => {
    let s = reduceSetup(onNames, { type: 'confirmNames' }); // required
    expect(s.error).toBe('required');
    s = reduceSetup(s, { type: 'setName', which: 1, value: 'Luca' });
    expect(s.error).toBeNull();
  });
});

describe('setup wizard — interstitial between couples only', () => {
  it('goes to PASS after a non-last couple, showing the next duo', () => {
    const start = reduceSetup(initSetup(), { type: 'pickCount', count: 3 });
    const c0 = buildCouple(start, 'otters', 'A', 'B');
    expect(c0.step).toBe('pass');
    expect(c0.coupleIdx).toBe(1); // next couple → "Duo 2"
    expect(c0.avatar).toBeNull(); // draft reset for the next couple
  });

  it('solo (1 couple): NAMES goes straight to done, no interstitial', () => {
    const start = reduceSetup(initSetup(), { type: 'pickCount', count: 1 });
    expect(isLastCouple(start)).toBe(true);
    const done = buildCouple(start, 'otters', 'A', 'B');
    expect(done.step).toBe('done');
    expect(done.teams).toHaveLength(1);
  });

  it('no interstitial after the LAST couple → done with the full roster', () => {
    const start = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
    const c0 = reduceSetup(buildCouple(start, 'otters', 'A', 'B'), { type: 'confirmPass' });
    const c1 = buildCouple(c0, 'lions', 'C', 'D');
    expect(c1.step).toBe('done');
    expect(c1.teams.map((t) => t.avatarId)).toEqual(['otters', 'lions']);
    expect(c1.teams.map((t) => t.teamId)).toEqual(['t1', 't2']);
  });
});

describe('setup wizard — back navigation keeps state', () => {
  it('NAMES back → TEAM keeps the typed names and avatar', () => {
    let s = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
    s = reduceSetup(s, { type: 'selectAvatar', avatarId: 'otters' });
    s = reduceSetup(s, { type: 'confirmTeam' });
    s = reduceSetup(s, { type: 'setName', which: 1, value: 'Luca' });
    s = reduceSetup(s, { type: 'setName', which: 2, value: 'Morgane' });
    s = reduceSetup(s, { type: 'back' });
    expect(s.step).toBe('team');
    expect(s.avatar).toBe('otters');
    expect(s.name1).toBe('Luca');
    expect(s.name2).toBe('Morgane');
  });

  it('TEAM back on couple 0 → count step', () => {
    let s = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
    s = reduceSetup(s, { type: 'back' });
    expect(s.step).toBe('count');
  });

  it('TEAM back on a later couple → previous couple NAMES restored, others kept', () => {
    const start = reduceSetup(initSetup(), { type: 'pickCount', count: 3 });
    const c0 = buildCouple(start, 'otters', 'Luca', 'Morgane'); // → pass (couple 1)
    const onTeam1 = reduceSetup(c0, { type: 'confirmPass' });
    const back = reduceSetup(onTeam1, { type: 'back' });
    expect(back.step).toBe('names');
    expect(back.coupleIdx).toBe(0);
    expect(back.avatar).toBe('otters');
    expect(back.name1).toBe('Luca');
    expect(back.name2).toBe('Morgane');
    expect(back.teams).toEqual([]); // popped back into the draft, not lost
  });

  it('PASS back → previous couple NAMES restored', () => {
    const start = reduceSetup(initSetup(), { type: 'pickCount', count: 3 });
    const c0 = buildCouple(start, 'otters', 'Luca', 'Morgane'); // step pass
    const back = reduceSetup(c0, { type: 'back' });
    expect(back.step).toBe('names');
    expect(back.coupleIdx).toBe(0);
    expect(back.name1).toBe('Luca');
  });

  it('re-confirming after a back re-adds the couple with a stable teamId', () => {
    const start = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
    const c0 = buildCouple(start, 'otters', 'Luca', 'Morgane');
    const back = reduceSetup(reduceSetup(c0, { type: 'confirmPass' }), { type: 'back' });
    const again = reduceSetup(back, { type: 'confirmNames' });
    expect(again.step).toBe('pass');
    expect(again.teams[0]?.teamId).toBe('t1');
  });
});

describe('hasDuplicateName', () => {
  it('detects trimmed, case-insensitive repeats', () => {
    expect(hasDuplicateName(['Luca', 'Morgane'])).toBe(false);
    expect(hasDuplicateName(['Luca', ' luca '])).toBe(true);
    expect(hasDuplicateName(['A', 'B', 'C', 'a'])).toBe(true);
  });
});
