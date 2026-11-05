import { describe, expect, it } from 'vitest';
import { playerArtUrl, teamArtUrl } from '@/shared/Chrome';
import { gameAt, questionFor, testQuestions, testRoster } from '@/test/gameStates';
import { renderScreen } from '@/test/renderScreen';
import { DilemmaQuestion } from './DilemmaQuestion';
import { DilemmaResolve } from './DilemmaResolve';
import { Gate } from './Gate';
import { Judge } from './Judge';
import { RapidFire } from './RapidFire';

const solo = [testRoster[0]!];
const noop = () => {};
const imgSrc = (c: HTMLElement, sel: string) => c.querySelector(`${sel} img`)?.getAttribute('src');

describe('screens that ask someone to act show WHO acts', () => {
  it('Gate, handoff: the next answerer’s bust (couple 2 → no art → initial), no name duplicate in the badge', () => {
    const a = renderScreen(<Gate game={gameAt('handoff', { round: 1, couple: 0 })} dispatch={noop} />);
    expect(imgSrc(a.container, '.cb-actor')).toBe(playerArtUrl('otters', 2));
    expect(a.container.querySelector('.cb-actor-name')).toBeNull();
    expect(a.container.querySelector('h2')?.textContent).toContain('Bo');
    const b = renderScreen(<Gate game={gameAt('handoff', { round: 0, couple: 1 })} dispatch={noop} />);
    expect(b.container.querySelector('.cb-actor .cb-player-avatar')?.textContent).toBe('Z');
  });

  it('Gate, pass-phone (solo, secret): the answerer’s bust; the title names them', () => {
    const { container } = renderScreen(
      <Gate game={gameAt('gate', { round: 0, roster: solo })} dispatch={noop} />,
    );
    expect(imgSrc(container, '.cb-actor')).toBe(playerArtUrl('otters', 1));
    expect(container.querySelector('h1')?.textContent).toContain('Ana');
  });

  it('Gate, pass-phone (solo, back): the GUESSER’s bust and name (the title has none)', () => {
    const { container } = renderScreen(
      <Gate game={gameAt('gate', { round: 0, roster: solo, side: 'guessers' })} dispatch={noop} />,
    );
    expect(imgSrc(container, '.cb-actor')).toBe(playerArtUrl('otters', 2));
    expect(container.querySelector('.cb-actor-name')?.textContent).toBe('Bo');
  });

  it('Gate, side gate / Judge / DilemmaQuestion: the table acts — no single actor', () => {
    expect(renderScreen(<Gate game={gameAt('gate', { side: 'answerers' })} dispatch={noop} />).container.querySelector('.cb-actor')).toBeNull();
    expect(
      renderScreen(<Judge game={gameAt('judge')} question={questionFor(gameAt('judge'))} dispatch={noop} />).container.querySelector('.cb-actor'),
    ).toBeNull();
    expect(
      renderScreen(<DilemmaQuestion game={gameAt('ask')} question={testQuestions[0]} onReady={noop} />).container.querySelector('.cb-actor'),
    ).toBeNull();
  });

  it('DilemmaResolve: the couple — team art, and “Name & Name” under the title', () => {
    const { container } = renderScreen(
      <DilemmaResolve game={gameAt('resolve', { couple: 0 })} question={testQuestions[0]} dispatch={noop} />,
    );
    expect(container.querySelector('.cb-char')?.getAttribute('src')).toBe(teamArtUrl('otters', 'full'));
    expect(container.querySelector('.cb-actor-names')?.textContent).toBe('Ana & Bo');
  });

  it('RapidFire: turn → couple names; question → couple row (portrait, team name, names); judge → crowd only', () => {
    const turn = renderScreen(<RapidFire game={gameAt('rapidTurn', { couple: 1 })} question={undefined} dispatch={noop} onReady={noop} />);
    expect(turn.container.querySelector('.cb-actor-names')?.textContent).toBe('Zed & Yan');
    const q = renderScreen(<RapidFire game={gameAt('rapidAsk', { couple: 0 })} question={testQuestions[0]} dispatch={noop} onReady={noop} />);
    expect(imgSrc(q.container, '.cb-actor--row')).toBe(teamArtUrl('otters', 'portrait', 256));
    expect(q.container.querySelector('.cb-actor--row .cb-actor-name')?.textContent).toBe('The Otters');
    expect(q.container.querySelector('.cb-actor--row .cb-actor-names')?.textContent).toBe('Ana & Bo');
    const j = renderScreen(<RapidFire game={gameAt('rapidJudge', { couple: 0 })} question={testQuestions[0]} dispatch={noop} onReady={noop} />);
    expect(j.container.querySelector('.cb-actor')).toBeNull();
  });

  it('RapidFire: the question is about each partner in turn', () => {
    const base = gameAt('rapidAsk', { couple: 0 });
    const question = { ...testQuestions[0]!, name: 'Q de {name}' };
    const textAt = (q: number) =>
      renderScreen(<RapidFire game={{ ...base, step: { ...base.step, q } }} question={question} dispatch={noop} onReady={noop} />)
        .container.querySelector('.cb-rapid-question .cb-question')?.textContent;
    expect(textAt(0)).toBe('Q de Ana');
    expect(textAt(1)).toBe('Q de Bo');
  });
});
