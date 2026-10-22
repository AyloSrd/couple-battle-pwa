import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import type { THistoryEntry, TGameState } from '../domain/machine';
import { FinalScreen } from './FinalScreen';

function mount(ui: ReactElement, lang: 'fr' | 'en' = 'fr') {
  return render(
    <LangProvider initialLang={lang}>
      <SoundApiProvider api={createSoundNoopApi()}>{ui}</SoundApiProvider>
    </LangProvider>,
  );
}

const roster = [
  { teamId: 't1', avatarId: 'lions', players: ['Ana', 'Bob'] },
  { teamId: 't2', avatarId: 'bears', players: ['Cleo', 'Dan'] },
  { teamId: 't3', avatarId: 'owls', players: ['Eva', 'Fil'] },
] as const;

function finalState(
  scores: Record<string, number>,
  teams = 3,
  history: THistoryEntry[] = [],
  mode: TGameState['mode'] = 'dilemma',
): Extract<TGameState, { kind: 'final' }> {
  return {
    kind: 'final',
    roster: roster.slice(0, teams).map((r) => ({ ...r, players: [...r.players] as [string, string] })),
    mode,
    difficulty: 'easy',
    themes: [],
    deck: [],
    scores,
    history,
  } as unknown as Extract<TGameState, { kind: 'final' }>;
}

const noop = () => {};

describe('FinalScreen — headline', () => {
  it('crowns a single winner', () => {
    mount(<FinalScreen state={finalState({ t1: 5, t2: 3, t3: 1 })} onRematch={noop} onNewGame={noop} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Les Lions remporte la bataille');
    expect(screen.queryByText(/Ex æquo/)).toBeNull();
  });

  it('names every tied team on a 2-way tie (FR)', () => {
    mount(<FinalScreen state={finalState({ t1: 4, t2: 4, t3: 1 })} onRematch={noop} onNewGame={noop} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Ex æquo');
    expect(h1).toHaveTextContent('Les Lions');
    expect(h1).toHaveTextContent('Les Ours');
    expect(h1).not.toHaveTextContent('Les Chouettes');
    expect(screen.getByText(/4 pts/)).toBeInTheDocument();
    expect(screen.queryByText(/remporte la bataille/)).toBeNull();
  });

  it('names all three teams on a 3-way tie (EN)', () => {
    mount(<FinalScreen state={finalState({ t1: 2, t2: 2, t3: 2 })} onRematch={noop} onNewGame={noop} />, 'en');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent("It's a tie");
    for (const name of ['The Lions', 'The Bears', 'The Owls']) expect(h1).toHaveTextContent(name);
  });

  it('keeps the solo headline', () => {
    mount(
      <FinalScreen
        state={finalState({ t1: 0 }, 1)}
        solo={{ isBest: true, points: 0, best: 0 }}
        onRematch={noop}
        onNewGame={noop}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nouveau record');
  });
});

describe('FinalScreen — hero slot', () => {
  it('shows the full-body hero for a single winner, no tie portraits', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 5, t2: 3, t3: 1 })} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelector('.cb-char, .cb-char-placeholder')).not.toBeNull();
    expect(container.querySelector('.cb-final-tied')).toBeNull();
  });

  it('shows one portrait per tied team instead of the hero', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 4, t2: 4, t3: 1 })} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelector('.cb-char, .cb-char-placeholder')).toBeNull();
    expect(container.querySelectorAll('.cb-final-tied .cb-team-art')).toHaveLength(2);
  });

  it('shows all three portraits on a 3-way tie', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 2, t2: 2, t3: 2 })} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelectorAll('.cb-final-tied .cb-team-art')).toHaveLength(3);
  });
});

const h = (teamId: string, stage: THistoryEntry['stage'], points: number, max: number, round = 0): THistoryEntry => ({
  teamId,
  stage,
  round,
  points,
  max,
});

describe('FinalScreen — per-team charts', () => {
  const dilemmaHistory: THistoryEntry[] = [
    h('t1', 'dilemma', 1, 1),
    h('t1', 'dilemma', 1, 1),
    h('t1', 'dilemma', 0, 1),
    h('t1', 'dilemma', 1, 1),
    h('t2', 'dilemma', 0, 1),
    h('t2', 'dilemma', 1, 1),
    h('t2', 'dilemma', 0, 1),
    h('t2', 'dilemma', 0, 1),
  ];

  it('shows one chart block per team, in ranked order, with sync % and a heart summary', () => {
    const { container } = mount(
      <FinalScreen
        state={finalState({ t1: 3, t2: 1 }, 2, dilemmaHistory)}
        onRematch={noop}
        onNewGame={noop}
      />,
      'en',
    );
    const blocks = container.querySelectorAll('.cb-row .cb-stats');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveTextContent('75%');
    expect(blocks[1]).toHaveTextContent('25%');
    expect(screen.getByRole('img', { name: '3 of 4 in sync' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1 of 4 in sync' })).toBeInTheDocument();
    expect(container.querySelectorAll('.cb-heart--full')).toHaveLength(4);
    expect(container.querySelectorAll('.cb-heart--empty')).toHaveLength(4);
  });

  it('puts the best team first even when the roster order differs', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 1, t2: 3 }, 2, [h('t1', 'dilemma', 1, 1), h('t2', 'dilemma', 1, 1)])} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelectorAll('.cb-row')[0]).toHaveTextContent('Cleo');
  });

  it('single-stage games show no stage bars', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 3, t2: 1 }, 2, dilemmaHistory)} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelector('.cb-stages')).toBeNull();
    expect(container.querySelector('.cb-vsbest')).toBeNull();
  });

  it('standalone Flash splits the two rounds and shows a half heart for a close answer', () => {
    const history = [h('t1', 'flash', 2, 2, 0), h('t1', 'flash', 1, 2, 0), h('t1', 'flash', 0, 2, 1), h('t1', 'flash', 2, 2, 1)];
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 5 }, 2, history, 'flash')} onRematch={noop} onNewGame={noop} />,
      'en',
    );
    const stages = container.querySelectorAll('.cb-stage');
    expect(stages).toHaveLength(2);
    expect(stages[0]).toHaveTextContent('Round 1/2');
    expect(stages[1]).toHaveTextContent('Round 2/2');
    expect(container.querySelectorAll('.cb-heart--half')).toHaveLength(1);
    expect(screen.getByRole('img', { name: '2 of 4 in sync, 1 close' })).toBeInTheDocument();
  });

  it('Ultime shows a bar per stage: Flash, Dilemma, Rapid-fire', () => {
    const history = [h('t1', 'flash', 2, 2, 0), h('t1', 'flash', 0, 2, 1), h('t1', 'dilemma', 1, 1), h('t1', 'rapid', 2, 2)];
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 5 }, 2, history, 'ultime')} onRematch={noop} onNewGame={noop} />,
      'en',
    );
    const labels = [...container.querySelectorAll('.cb-stage')].map((el) => el.textContent);
    expect(labels).toEqual(['Flash', 'Dilemma', 'Rapid-fire']);
  });

  it('solo shows this game against the best, scaled to the larger of the two', () => {
    const { container } = mount(
      <FinalScreen
        state={finalState({ t1: 2 }, 1, [h('t1', 'dilemma', 1, 1), h('t1', 'dilemma', 1, 1), h('t1', 'dilemma', 0, 1)])}
        solo={{ isBest: false, points: 2, best: 8 }}
        onRematch={noop}
        onNewGame={noop}
      />,
      'en',
    );
    const rows = container.querySelectorAll('.cb-vsbest li');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('This game');
    expect(rows[0]).toHaveTextContent('2');
    expect(rows[1]).toHaveTextContent('Your best');
    expect(rows[1]).toHaveTextContent('8');
    const fills = container.querySelectorAll<HTMLElement>('.cb-vsbest .cb-meter-fill');
    expect(fills[0]?.style.getPropertyValue('--cb-fill')).toBe('25%');
    expect(fills[1]?.style.getPropertyValue('--cb-fill')).toBe('100%');
  });

  it('a multi-team game never shows the vs-best bars', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 3, t2: 1 }, 2, dilemmaHistory)} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelector('.cb-vsbest')).toBeNull();
  });

  it('empty history (a resumed old snapshot) renders exactly the plain score rows, no charts', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 5, t2: 3, t3: 1 })} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelector('.cb-stats')).toBeNull();
    expect(container.querySelector('.cb-hearts')).toBeNull();
    expect(container.querySelectorAll('.cb-row')).toHaveLength(3);
    expect(screen.queryByRole('img', { name: /sync|synchro/ })).toBeNull();
  });

  it('empty history in solo keeps just the headline', () => {
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 2 }, 1)} solo={{ isBest: true, points: 2, best: 2 }} onRematch={noop} onNewGame={noop} />,
    );
    expect(container.querySelector('.cb-vsbest')).toBeNull();
  });

  it('a tie draws identical charts for the tied teams (FR labels)', () => {
    const history = [h('t1', 'dilemma', 1, 1), h('t2', 'dilemma', 1, 1)];
    const { container } = mount(
      <FinalScreen state={finalState({ t1: 1, t2: 1 }, 2, history)} onRematch={noop} onNewGame={noop} />,
    );
    const pcts = [...container.querySelectorAll('.cb-stats-sync .cb-stats-pct')].map((n) => n.textContent);
    expect(pcts).toEqual(['100%', '100%']);
    expect(container.querySelectorAll('.cb-row')[0]).toHaveTextContent('Synchro');
  });
});
