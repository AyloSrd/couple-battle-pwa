import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '@/shared/game/domain/types';
import { answerKey, newGame, type TDeckCard, type TGame } from '@/shared/game/domain/game';
import { cardOf, reduce, type TGameEventBody } from '@/views/Play/domain/machine';
import { bootTestSave, expectSynced } from '@/test/expectSynced';
import type { TSaveApi } from '../api';
import { decode, encode } from '../domain/codec';
import { createSaveStore } from './store';

/** A saved game whose deck holds a `choice` card: it round-trips through the codec and resumes where it was left (no migration). */

/** A new store over the same storage, booted the way the app does (a relaunch). */
function relaunch(api: TSaveApi) {
  const store = createSaveStore(api, api.load());
  store.recover(() => true);
  return { store };
}

const NOW = Date.UTC(2026, 10, 21, 20, 0, 0);
const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['Ana', 'Bo'] as [string, string] }];
const deck: TDeckCard[] = [
  { id: 11, type: 'open' },
  { id: 12, type: 'choice' },
  { id: 13, type: 'yes_no' },
  { id: 14, type: 'choice' },
];
const start = (): TGame => newGame({ roster, mode: 'flash', difficulty: 'mix', themes: [...THEME_IDS], deck });
const play = (game: TGame, ...events: TGameEventBody[]): TGame => events.reduce((g, e) => reduce(g, { ...e, seq: g.ctx.seq }), game);
const answer = (value: string): TGameEventBody => ({ type: 'answer', value });

/** On the Secret screen of the choice card (slot 1): the open card was answered. */
const atSecret = () => play(start(), { type: 'next' }, answer('pasta'));
/** On the Guess screen of the choice card (slot 1): both answered, the guessers' gate crossed, the open card revealed and judged. */
const atGuess = () => play(atSecret(), answer('c2'), { type: 'next' }, { type: 'next' }, { type: 'verdict', v: 'miss' });

describe('choice cards in a save', () => {
  it('the fixtures stand where the tests say', () => {
    expect(atSecret().step).toMatchObject({ kind: 'secret', q: 1 });
    expect(atGuess().step).toMatchObject({ kind: 'guess', q: 1 });
  });

  it.each([
    ['the start', start],
    ['the Secret of a choice card', atSecret],
    ['the Guess of a choice card', atGuess],
  ])('round-trips through the codec at %s', (_label, make) => {
    const game = make();
    expect(decode('game', encode('game', game, NOW))).toEqual({ kind: 'ok', data: game, savedAt: NOW });
  });

  it('the locked token is part of what is saved at the Guess', () => {
    const game = atGuess();
    const decoded = decode('game', encode('game', game, NOW));
    expect(decoded.kind).toBe('ok');
    const data = decoded.kind === 'ok' ? decoded.data : null;
    expect(data && 'secrets' in data.step && data.step.secrets[answerKey('t1', 12)]).toBe('c2');
  });

  it.each([
    ['secret', atSecret],
    ['guess', atGuess],
  ])('resumes at %s: a relaunch shows the very same game, status ok, nothing dropped', (_label, make) => {
    const game = make();
    const { api, store } = bootTestSave({ game });
    expect(store.get().status).toBe('ok');
    expect(store.get().issues).toEqual([]);
    expect(store.get().game).toEqual(game);
    expectSynced(store, api);
    const again = relaunch(api);
    expect(again.store.get().game).toEqual(game);
    expect(decode('game', api.raw('game')).kind).toBe('ok');
  });

  it('the resumed game plays on: the locked token is judged by match', () => {
    const { store } = bootTestSave({ game: atGuess() });
    const resumed = store.get().game!;
    const matched = play(resumed, { type: 'guess', value: 'c2' });
    expect(matched.ctx.scores).toEqual({ t1: 2 });
  });

  it('a finished game with choice cards counts every id as seen, the choice ones too', () => {
    const { store } = bootTestSave({ profile: { seenIds: [1] } });
    store.startGame(start());
    let game = store.get().game!;
    for (let i = 0; i < 60 && game.step.kind !== 'final'; i++) {
      const { step } = game;
      const type = cardOf(game)?.type;
      const closed = (choice: string, yesNo: string) => (type === 'choice' ? choice : yesNo);
      const event: TGameEventBody =
        step.kind === 'secret'
          ? answer(closed('c0', type === 'yes_no' ? 'yes' : 'x'))
          : step.kind === 'guess'
            ? type === 'choice' || type === 'yes_no'
              ? { type: 'guess', value: closed('c1', 'yes') }
              : { type: 'next' }
            : step.kind === 'judge'
              ? { type: 'verdict', v: 'miss' }
              : { type: 'next' };
      const { next } = store.updateGame((current) => reduce(current, { ...event, seq: current.ctx.seq }));
      game = next!;
    }
    expect(game.step.kind).toBe('final');
    store.finishGame(game);
    const seen = store.get().profile.seenIds;
    for (const id of [11, 12, 13, 14]) expect(seen).toContain(id);
  });
});
