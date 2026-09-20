import type { TAvatarId, TTeam } from '@/shared/game/domain/types';

/**
 * The roster-building wizard as a pure sub-machine (same idea as Play's
 * domain machine). The /setup route stays one view; this drives which step it
 * shows and holds every couple's entry so back-navigation never loses data.
 *
 * Per couple, in order: TEAM (pick avatar) → NAMES (two players) → PASS
 * (hand-off interstitial, only BETWEEN couples). The very first screen is the
 * couple-count picker. After the LAST couple's NAMES we go straight to mode
 * select (surfaced as the `done` step for the view to act on).
 *
 * Invariant: `teams.length === coupleIdx` — completed couples always equal the
 * index of the couple currently being built (during PASS the just-finished
 * couple has already been folded in and coupleIdx advanced to the next).
 */

export type TSetupStep = 'count' | 'team' | 'names' | 'pass' | 'done';

/** Validation error on the NAMES step (null = none). Avatar "already taken" is
 *  a transient toast handled by the view, not a blocking step error. */
export type TSetupError = 'required' | 'duplicate' | null;

export type TSetupState = {
  step: TSetupStep;
  count: number | null; // chosen couple count (null until the count step is done)
  coupleIdx: number; // 0-based couple currently being built
  teams: TTeam[]; // completed couples (length === coupleIdx)
  avatar: TAvatarId | null; // current couple draft: chosen avatar
  name1: string;
  name2: string;
  error: TSetupError;
};

export type TSetupEvent =
  | { type: 'pickCount'; count: number }
  | { type: 'selectAvatar'; avatarId: TAvatarId }
  | { type: 'confirmTeam' }
  | { type: 'setName'; which: 1 | 2; value: string }
  | { type: 'confirmNames' }
  | { type: 'confirmPass' }
  | { type: 'back' };

export function initSetup(): TSetupState {
  return {
    step: 'count',
    count: null,
    coupleIdx: 0,
    teams: [],
    avatar: null,
    name1: '',
    name2: '',
    error: null,
  };
}

/** Avatars already claimed by completed couples — non-selectable in TEAM. */
export function takenAvatars(state: TSetupState): Set<TAvatarId> {
  return new Set(state.teams.map((team) => team.avatarId));
}

/** True once `names` holds a repeat, trimmed and compared case-insensitively. */
export function hasDuplicateName(names: string[]): boolean {
  const seen = new Set<string>();
  for (const raw of names) {
    const key = raw.trim().toLocaleLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/** Is the couple being built the final one? (drives NAMES button + no interstitial) */
export function isLastCouple(state: TSetupState): boolean {
  return state.count !== null && state.coupleIdx + 1 >= state.count;
}

const emptyDraft = { avatar: null, name1: '', name2: '', error: null } as const;

/** Pop the last completed couple back into the draft for editing (used by back
 *  from TEAM/PASS of a later couple). */
function editPrevious(state: TSetupState): TSetupState {
  const prev = state.teams[state.teams.length - 1];
  if (!prev) return state;
  return {
    ...state,
    step: 'names',
    coupleIdx: state.coupleIdx - 1,
    teams: state.teams.slice(0, -1),
    avatar: prev.avatarId,
    name1: prev.players[0],
    name2: prev.players[1],
    error: null,
  };
}

export function reduceSetup(state: TSetupState, event: TSetupEvent): TSetupState {
  switch (event.type) {
    case 'pickCount':
      return { ...initSetup(), step: 'team', count: event.count };

    case 'selectAvatar': {
      if (state.step !== 'team') return state;
      // Taken avatars are non-selectable; leave the current selection intact.
      if (takenAvatars(state).has(event.avatarId)) return state;
      // Re-tapping a free tile moves the selection.
      return { ...state, avatar: event.avatarId };
    }

    case 'confirmTeam':
      if (state.step !== 'team' || state.avatar === null) return state;
      return { ...state, step: 'names', error: null };

    case 'setName': {
      if (state.step !== 'names') return state;
      const key = event.which === 1 ? 'name1' : 'name2';
      return { ...state, [key]: event.value, error: null };
    }

    case 'confirmNames': {
      if (state.step !== 'names' || state.avatar === null) return state;
      if (!state.name1.trim() || !state.name2.trim()) {
        return { ...state, error: 'required' };
      }
      const rosterNames = state.teams
        .flatMap((team) => team.players)
        .concat(state.name1, state.name2);
      if (hasDuplicateName(rosterNames)) {
        return { ...state, error: 'duplicate' };
      }
      const team: TTeam = {
        teamId: `t${state.coupleIdx + 1}`,
        avatarId: state.avatar,
        players: [state.name1.trim(), state.name2.trim()],
      };
      const teams = [...state.teams, team];
      // Last couple → hand off to mode select. Otherwise → pass interstitial for
      // the next couple.
      if (isLastCouple(state)) {
        return { ...state, teams, step: 'done', error: null };
      }
      return { ...state, teams, coupleIdx: state.coupleIdx + 1, step: 'pass', ...emptyDraft };
    }

    case 'confirmPass':
      if (state.step !== 'pass') return state;
      return { ...state, step: 'team' };

    case 'back': {
      switch (state.step) {
        case 'names':
          // Back to TEAM, keeping any typed names + the chosen avatar.
          return { ...state, step: 'team', error: null };
        case 'team':
          if (state.coupleIdx === 0) return { ...state, step: 'count' };
          return editPrevious(state);
        case 'pass':
          return editPrevious(state);
        default:
          return state; // 'count' back is Home — the view navigates.
      }
    }

    default:
      return state;
  }
}
