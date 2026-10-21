import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import type { TGameState } from '../domain/machine';
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

function finalState(scores: Record<string, number>, teams = 3): Extract<TGameState, { kind: 'final' }> {
  return {
    kind: 'final',
    roster: roster.slice(0, teams).map((r) => ({ ...r, players: [...r.players] as [string, string] })),
    mode: 'dilemma',
    difficulty: 'easy',
    themes: [],
    deck: [],
    scores,
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
