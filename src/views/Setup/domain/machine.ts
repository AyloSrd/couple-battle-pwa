import type { TAvatarId, TRoster, TTeam } from '@/shared/game/domain/types';
import { NAME_MAX } from '@/shared/game/domain/game';
import { normalizeText } from '@/shared/game/domain/text';

/**
 * The roster-building wizard as a pure sub-machine: the /setup route stays one view; this drives
 * its step and holds every couple's entry so Back never loses data. Count, then per couple TEAM →
 * NAMES → PASS (only BETWEEN couples); after the LAST couple's NAMES, `done` (the view goes to Mode).
 *
 * Invariant: `teams.length === coupleIdx` (during PASS the finished couple is already folded in).
 */

export type TSetupStep = 'count' | 'team' | 'names' | 'pass' | 'done';

/** NAMES validation error. "Avatar taken" is a transient toast in the view, not a step error. */
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

const START: TSetupState = { step: 'count', count: null, coupleIdx: 0, teams: [], avatar: null, name1: '', name2: '', error: null };

/**
 * The wizard's first state. With a roster (the draft: Back from Mode, or Rematch then Back) it
 * reopens on the last couple's NAMES step with every couple kept, as Back from `done` would.
 */
export function initSetup(roster?: TRoster | null): TSetupState {
  if (!roster?.length) return START;
  return editPrevious({ ...START, count: roster.length, coupleIdx: roster.length, teams: roster });
}

/** Avatars already claimed by completed couples — non-selectable in TEAM. */
export function takenAvatars(state: TSetupState): Set<TAvatarId> {
  return new Set(state.teams.map((team) => team.avatarId));
}

/** A player name as it enters the roster (S10): NFC, no invisible / bidi characters, trimmed, capped. */
export function cleanName(raw: string): string {
  return normalizeText(raw, NAME_MAX);
}

/** True once `names` holds a repeat, cleaned and compared case-insensitively. */
export function hasDuplicateName(names: string[]): boolean {
  const keys = names.map((name) => cleanName(name).toLocaleLowerCase());
  return new Set(keys).size !== keys.length;
}

/** Is the couple being built the final one? (drives NAMES button + no interstitial) */
export function isLastCouple(state: TSetupState): boolean {
  return state.count !== null && state.coupleIdx + 1 >= state.count;
}

/** Pop the last completed couple back into the draft for editing (Back from a later couple). */
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
      return { ...START, step: 'team', count: event.count };

    case 'selectAvatar': {
      if (state.step !== 'team') return state;
      if (takenAvatars(state).has(event.avatarId)) return state;
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
      const name1 = cleanName(state.name1);
      const name2 = cleanName(state.name2);
      if (!name1 || !name2) return { ...state, error: 'required' };
      if (hasDuplicateName([...state.teams.flatMap((team) => team.players), name1, name2])) {
        return { ...state, error: 'duplicate' };
      }
      const team: TTeam = { teamId: `t${state.coupleIdx + 1}`, avatarId: state.avatar, players: [name1, name2] };
      const teams = [...state.teams, team];
      // Last couple → hand off to mode select; otherwise the pass interstitial for the next one.
      if (isLastCouple(state)) return { ...state, teams, step: 'done', error: null };
      return { ...state, teams, coupleIdx: state.coupleIdx + 1, step: 'pass', avatar: null, name1: '', name2: '', error: null };
    }

    case 'confirmPass':
      if (state.step !== 'pass') return state;
      return { ...state, step: 'team' };

    case 'back': {
      switch (state.step) {
        case 'names':
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
