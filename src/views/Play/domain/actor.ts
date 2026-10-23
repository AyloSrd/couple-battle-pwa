import type { TTeam } from '@/shared/game/domain/types';
import { answererIndex, type TGameState } from './machine';

/**
 * WHO ACTS on a screen — so it is never ambiguous whose turn it is.
 *  - `player` — one named person (an answerer, a guesser, whoever takes the phone);
 *    `playerIdx` indexes `team.players` (0 ↔ art p1, 1 ↔ art p2).
 *  - `couple` — the couple acts together (Dilemma self-confirm, rapid-fire).
 *  - `table`  — the whole table acts (points, judges, sides, scoreboards): no single face.
 */
export type TActor =
  | { kind: 'player'; team: TTeam; playerIdx: 0 | 1 }
  | { kind: 'couple'; team: TTeam }
  | { kind: 'table' };

const TABLE: TActor = { kind: 'table' };

/** Art slot (p1 | p2) of a player index: players[0] ↔ p1, players[1] ↔ p2. */
export function playerSlot(playerIdx: 0 | 1): 1 | 2 {
  return (playerIdx + 1) as 1 | 2;
}

/** The round's guesser is the answerer's partner. */
function guesserIndex(round: number): 0 | 1 {
  return (1 - answererIndex(round)) as 0 | 1;
}

/** Who the screen for `state` asks to act. Solo games have no table to share with:
 *  their side gates are addressed to the one couple's answerer / guesser. */
export function actorOf(state: TGameState): TActor {
  const team = 'coupleIdx' in state ? state.roster[state.coupleIdx] : undefined;
  switch (state.kind) {
    case 'handoff':
    case 'secretInput':
      return team ? { kind: 'player', team, playerIdx: answererIndex(state.round) } : TABLE;
    case 'guess':
      return team ? { kind: 'player', team, playerIdx: guesserIndex(state.round) } : TABLE;
    case 'sideAnswerers':
    case 'sideGuessers': {
      const solo = state.roster.length === 1 ? state.roster[0] : undefined;
      if (!solo) return TABLE;
      const playerIdx = state.kind === 'sideAnswerers' ? answererIndex(state.round) : guesserIndex(state.round);
      return { kind: 'player', team: solo, playerIdx };
    }
    case 'resolve':
    case 'rapidTurn':
    case 'rapidQuestion':
    case 'rapidCountdown':
      return team ? { kind: 'couple', team } : TABLE;
    // the table points / judges / reads: no single actor
    case 'question':
    case 'countdown':
    case 'judge':
    case 'rapidIntro':
    case 'rapidJudge':
    case 'scoreboard':
    case 'final':
      return TABLE;
  }
}
