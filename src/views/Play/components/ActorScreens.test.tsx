import { describe, expect, it } from 'vitest';
import { playerArtUrl, teamArtUrl } from '@/shared/Chrome';
import { gameState, testRoster } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { DilemmaQuestion } from './DilemmaQuestion';
import { DilemmaResolve } from './DilemmaResolve';
import { Handoff } from './Handoff';
import { Judge } from './Judge';
import { PassPhone } from './PassPhone';
import { RapidFire } from './RapidFire';
import { SideGate } from './SideGate';

const solo = [testRoster[0]!];
const noop = () => {};
const imgSrc = (c: HTMLElement, sel: string) => c.querySelector(`${sel} img`)?.getAttribute('src');

describe('screens that ask someone to act show WHO acts', () => {
  it('Handoff: the next answerer’s bust (couple 2 → no art → initial), no name duplicate in the badge', () => {
    const a = renderScreen(<Handoff state={gameState('handoff', { round: 1, coupleIdx: 0 })} onConfirm={noop} />);
    expect(imgSrc(a.container, '.cb-actor')).toBe(playerArtUrl('otters', 2));
    expect(a.container.querySelector('.cb-actor-name')).toBeNull();
    expect(a.container.querySelector('h2')?.textContent).toContain('Bo');
    const b = renderScreen(<Handoff state={gameState('handoff', { round: 0, coupleIdx: 1 })} onConfirm={noop} />);
    expect(b.container.querySelector('.cb-actor .cb-player-avatar')?.textContent).toBe('Z');
  });

  it('PassPhone (solo, secret): the answerer’s bust; the title names them', () => {
    const { container } = renderScreen(
      <PassPhone variant="secret" state={gameState('sideAnswerers', { round: 0, roster: solo })} onConfirm={noop} />,
    );
    expect(imgSrc(container, '.cb-actor')).toBe(playerArtUrl('otters', 1));
    expect(container.querySelector('h1')?.textContent).toContain('Ana');
  });

  it('PassPhone (solo, back): the GUESSER’s bust and name (the title has none)', () => {
    const { container } = renderScreen(
      <PassPhone variant="back" state={gameState('sideGuessers', { round: 0, roster: solo })} onConfirm={noop} />,
    );
    expect(imgSrc(container, '.cb-actor')).toBe(playerArtUrl('otters', 2));
    expect(container.querySelector('.cb-actor-name')?.textContent).toBe('Bo');
  });

  it('SideGate / Judge / DilemmaQuestion: the table acts — no single actor', () => {
    expect(renderScreen(<SideGate side="answerers" onConfirm={noop} />).container.querySelector('.cb-actor')).toBeNull();
    expect(
      renderScreen(<Judge state={gameState('judge')} answererName="Ana" onJudge={noop} />).container.querySelector('.cb-actor'),
    ).toBeNull();
    expect(
      renderScreen(<DilemmaQuestion state={gameState('question')} onReady={noop} />).container.querySelector('.cb-actor'),
    ).toBeNull();
  });

  it('DilemmaResolve: the couple — team art, and “Name & Name” under the title', () => {
    const { container } = renderScreen(
      <DilemmaResolve state={gameState('resolve', { coupleIdx: 0 })} onConfirm={noop} />,
    );
    expect(container.querySelector('.cb-char')?.getAttribute('src')).toBe(teamArtUrl('otters', 'full'));
    expect(container.querySelector('.cb-actor-names')?.textContent).toBe('Ana & Bo');
  });

  it('RapidFire: turn → couple names; question → couple row (portrait, team name, names); judge → crowd only', () => {
    const turn = renderScreen(<RapidFire state={gameState('rapidTurn', { coupleIdx: 1 })} onNext={noop} onReady={noop} onJudge={noop} />);
    expect(turn.container.querySelector('.cb-actor-names')?.textContent).toBe('Zed & Yan');
    const q = renderScreen(<RapidFire state={gameState('rapidQuestion', { coupleIdx: 0 })} onNext={noop} onReady={noop} onJudge={noop} />);
    expect(imgSrc(q.container, '.cb-actor--row')).toBe(teamArtUrl('otters', 'portrait', 256));
    expect(q.container.querySelector('.cb-actor--row .cb-actor-name')?.textContent).toBe('The Otters');
    expect(q.container.querySelector('.cb-actor--row .cb-actor-names')?.textContent).toBe('Ana & Bo');
    const j = renderScreen(<RapidFire state={gameState('rapidJudge', { coupleIdx: 0 })} onNext={noop} onReady={noop} onJudge={noop} />);
    expect(j.container.querySelector('.cb-actor')).toBeNull();
  });
});
