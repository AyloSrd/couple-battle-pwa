import { AVATAR_IDS, type TMode, type TRoster } from '@/shared/game/domain/types';
import type { TDeckCard, THistoryEntry } from '@/shared/game/domain/game';
import type { TQuestionType } from '@/shared/questions/domain/types';
import { deckSizeFor } from '@/shared/questions/domain/services';

/**
 * Golden traces: the pre-refactor machine (17 states, 10 events) was played with a scripted
 * policy and every screen it showed was recorded in `goldenTraces.json`. The new reducer must
 * reproduce those lines exactly from the same policy. This module holds what both drivers
 * share: the cases, the policy and the line format. Legacy names were mapped to the new ones
 * when recording (question → ask, sideAnswerers/sideGuessers → gate, secretInput → secret,
 * rapidQuestion → rapidAsk); countdown / rapidCountdown were UI beats and are not recorded.
 */

export type TGoldenCase = { name: string; mode: TMode; couples: number; deck: TDeckCard[] };

const FLASH_TYPES: readonly TQuestionType[] = ['open', 'yes_no', 'this_or_that', 'who_of_two'];

/** Card types by deck index: the shared Flash block cycles every type (rotated per case),
 *  Dilemma is who_of_two, rapid-fire is open — as the real draw does. */
function deckFor(mode: TMode, couples: number, size: number): TDeckCard[] {
  return Array.from({ length: size }, (_, i) => {
    const flashBlock = mode !== 'dilemma' && i < 4;
    const type: TQuestionType = flashBlock
      ? FLASH_TYPES[(i + couples) % FLASH_TYPES.length]!
      : mode === 'ultime' && i >= 9
        ? 'open'
        : 'who_of_two';
    return { id: 100 + i, type };
  });
}

function goldenCase(mode: TMode, couples: number, size = deckSizeFor(mode, couples)): TGoldenCase {
  return { name: `${mode} · ${couples} couple(s) · ${size} card(s)`, mode, couples, deck: deckFor(mode, couples, size) };
}

export const GOLDEN_CASES: TGoldenCase[] = [
  ...(['flash', 'dilemma', 'ultime'] as const).flatMap((mode) => [1, 2, 3, 4].map((n) => goldenCase(mode, n))),
  // Dilemma deck sizes around the halfway board (count 1 has none; 3 → after 1; 9 → after 4).
  goldenCase('dilemma', 2, 1),
  goldenCase('dilemma', 1, 1),
  goldenCase('dilemma', 2, 3),
  goldenCase('dilemma', 3, 9),
  // Short decks (drawDeck may return fewer): slots with no card must never stick.
  goldenCase('flash', 2, 3),
  goldenCase('flash', 1, 1),
  goldenCase('ultime', 2, 7),
  goldenCase('ultime', 4, 2),
];

export function goldenRoster(n: number): TRoster {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i + 1}`,
    avatarId: AVATAR_IDS[i]!,
    players: [`P${i + 1}a`, `P${i + 1}b`] as [string, string],
  }));
}

/** What a recorder sees on one screen, already in the new vocabulary. */
export type TNormStep = {
  kind: string;
  seg?: number | undefined;
  side?: string | undefined;
  q?: number | undefined;
  couple?: number | undefined;
  resumeQ?: number | undefined;
  /** The card this step shows (undefined: no card, or past a short deck). */
  card?: TDeckCard | undefined;
  results?: Record<string, string> | undefined;
  secrets?: Record<string, string> | undefined;
  scores: Record<string, number>;
  history: readonly THistoryEntry[];
};

/** The scripted policy's move, machine-neutral. */
export type TAction =
  | { type: 'next' }
  | { type: 'answer'; value: string }
  | { type: 'guess'; value: string }
  | { type: 'verdict'; v: 'exact' | 'close' | 'miss' };

const TOKENS: Partial<Record<TQuestionType, readonly [string, string]>> = {
  yes_no: ['yes', 'no'],
  who_of_two: ['p0', 'p1'],
};

/** The n-th decision on a screen: cycles verdicts, answers and picks so every branch is hit. */
export function policy(step: TNormStep, n: number): TAction {
  const tokens = step.card ? TOKENS[step.card.type] : undefined;
  switch (step.kind) {
    case 'resolve':
      return { type: 'verdict', v: (['exact', 'miss', 'exact', 'exact', 'miss'] as const)[n % 5]! };
    case 'secret':
      if (!step.card) return { type: 'answer', value: 'zzz' };
      return { type: 'answer', value: tokens ? tokens[n % 2]! : `a${n}` };
    case 'guess':
      if (!step.card) return n % 2 === 0 ? { type: 'guess', value: 'yes' } : { type: 'next' };
      return tokens ? { type: 'guess', value: tokens[(n % 3) % 2]! } : { type: 'next' };
    case 'judge':
      return { type: 'verdict', v: (['exact', 'close', 'miss'] as const)[n % 3]! };
    case 'rapidJudge':
      return { type: 'verdict', v: (['exact', 'miss', 'miss', 'exact'] as const)[n % 4]! };
    default:
      return { type: 'next' };
  }
}

function actionText(a: TAction): string {
  switch (a.type) {
    case 'next':
      return 'next';
    case 'answer':
      return `answer:${a.value}`;
    case 'guess':
      return `guess:${a.value}`;
    case 'verdict':
      return `verdict:${a.v}`;
  }
}

const entries = (r: Record<string, string | number>) =>
  Object.keys(r)
    .sort()
    .map((k) => `${k}=${r[k]}`)
    .join(',');

/** One recorded screen, as a single comparable line. `added` = history appended since the last screen. */
export function traceLine(step: TNormStep, added: readonly THistoryEntry[], action: TAction | undefined): string {
  const parts = [
    step.kind,
    step.seg !== undefined ? `s${step.seg}` : '',
    step.side ?? '',
    step.q !== undefined ? `q${step.q}` : '',
    step.couple !== undefined ? `c${step.couple}` : '',
    step.resumeQ !== undefined ? `resume${step.resumeQ}` : '',
    step.card ? `#${step.card.id}:${step.card.type}` : '',
  ].filter(Boolean);
  const extra = [
    `[${entries(step.scores)}]`,
    step.results ? `res{${entries(step.results)}}` : '',
    step.secrets && Object.keys(step.secrets).length > 0 ? `sec{${entries(step.secrets)}}` : '',
    added.length > 0 ? `+${added.map((h) => `${h.teamId}:${h.stage}/r${h.round}:${h.points}/${h.max}`).join(' ')}` : '',
    action ? `-> ${actionText(action)}` : '',
  ].filter(Boolean);
  return [...parts, ...extra].join(' ');
}

/**
 * Drive one game to `final` with the policy. `observe` normalises the machine's state,
 * `act` applies an action and returns the next state. Returns the recorded lines.
 */
export function runTrace<S>(start: S, observe: (s: S) => TNormStep, act: (s: S, a: TAction) => S): string[] {
  const lines: string[] = [];
  let s = start;
  let seen = 0;
  for (let n = 0; ; n++) {
    if (n > 2000) throw new Error('golden trace: no final after 2000 moves');
    const step = observe(s);
    const added = step.history.slice(seen);
    seen = step.history.length;
    if (step.kind === 'final') {
      lines.push(traceLine(step, added, undefined));
      return lines;
    }
    const action = policy(step, n);
    lines.push(traceLine(step, added, action));
    const next = act(s, action);
    if (next === s) throw new Error(`golden trace: stuck on ${lines[lines.length - 1]}`);
    s = next;
  }
}
