import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/react';
import { answerKey } from '@/shared/game';
import { soundEngine } from '@/shared/sound';
import { gameAt, questionFor } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { DilemmaResolve } from './DilemmaResolve';
import { Gate } from './Gate';
import { GuessReveal } from './GuessReveal';
import { Judge } from './Judge';
import { RapidFire } from './RapidFire';
import { Scoreboard } from './Scoreboard';
import { SecretAnswers } from './SecretAnswers';

const noop = () => {};

/** The card's flip ends. jsdom has no AnimationEvent, so React listens to the prefixed name
 *  there: send both, React hears exactly one. */
function landCard(card: Element) {
  fireEvent(card, new Event('animationend', { bubbles: true }));
  fireEvent(card, new Event('webkitAnimationEnd', { bubbles: true }));
}

/** Mount `ui`, forget its mount cues, then click the button named `name`: the sounds of that tap. */
function tapSounds(ui: Parameters<typeof renderScreen>[0], name: RegExp) {
  const play = vi.spyOn(soundEngine, 'play');
  const { container } = renderScreen(ui);
  play.mockClear();
  fireEvent.click(within(container).getByRole('button', { name }));
  return play.mock.calls.map(([id]) => id);
}

const closed = <K extends 'secret' | 'guess'>(kind: K, truth?: string) => {
  const base = gameAt(kind);
  const game = { ...base, ctx: { ...base.ctx, deck: [{ id: 1, type: 'yes_no' as const }] } };
  return truth === undefined ? game : { ...game, step: { ...game.step, secrets: { [answerKey('t1', 1)]: truth } } };
};
const yesNo = { id: 1, theme: 'childhood' as const, difficulty: 'easy' as const, type: 'yes_no' as const, you: 'Q?', name: 'Q {name}?' };

// Each tap plays exactly one sound — the button's own (kit `sfx`) or the one the handler picks.
describe('Play buttons: one sound per tap, the same as before the kit played them', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gates and Next-style buttons tap', () => {
    expect(tapSounds(<Gate game={gameAt('gate', { side: 'answerers' })} dispatch={noop} />, /./)).toEqual(['sfx.tap']);
    expect(tapSounds(<RapidFire game={gameAt('rapidIntro')} question={undefined} dispatch={noop} onReady={noop} />, /./)).toEqual([
      'sfx.tap',
    ]);
  });

  it('the scoreboard continues with the select blip', () => {
    expect(tapSounds(<Scoreboard game={gameAt('scoreboard')} dispatch={noop} />, /next round/i)).toEqual(['sfx.select']);
  });

  it('locking a secret plays the lock, nothing else', () => {
    expect(tapSounds(<SecretAnswers game={closed('secret')} question={yesNo} dispatch={noop} />, /yes/i)).toEqual(['sfx.lock']);
  });

  it('a guess pick plays the riser, its outcome when the card lands; NEXT then taps', () => {
    const play = vi.spyOn(soundEngine, 'play');
    const { getByRole, container } = renderScreen(<GuessReveal game={closed('guess', 'yes')} question={yesNo} dispatch={noop} />);
    play.mockClear();
    fireEvent.click(getByRole('button', { name: /no/i }));
    expect(play.mock.calls.map(([id]) => id)).toEqual(['sfx.reveal']);
    landCard(container.querySelector('.cb-flash-card--flip')!);
    expect(play.mock.calls.map(([id]) => id)).toEqual(['sfx.reveal', 'sfx.point.miss']);
    play.mockClear();
    fireEvent.click(getByRole('button', { name: /next/i }));
    expect(play.mock.calls.map(([id]) => id)).toEqual(['sfx.tap']);
  });

  it('verdicts play their outcome', () => {
    const judge = gameAt('judge');
    expect(tapSounds(<Judge game={judge} question={questionFor(judge)} dispatch={noop} />, /close/i)).toEqual(['sfx.point.close']);
    const resolve = gameAt('resolve');
    expect(tapSounds(<DilemmaResolve game={resolve} question={questionFor(resolve)} dispatch={noop} />, /missed/i)).toEqual([
      'sfx.point.miss',
    ]);
    const rapid = gameAt('rapidJudge');
    expect(tapSounds(<RapidFire game={rapid} question={questionFor(rapid)} dispatch={noop} onReady={noop} />, /in sync/i)).toEqual([
      'sfx.synchro',
    ]);
  });
});
