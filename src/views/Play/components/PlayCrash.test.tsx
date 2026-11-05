import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { newGame } from '@/shared/game';
import { renderWithApp } from '@/test/renderApp';
import { expectSynced } from '@/test/expectSynced';
import { PlayCrash } from './PlayCrash';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['A', 'B'] as [string, string] }];

describe('PlayCrash — /play error screen', () => {
  it('Retry remounts Play (resumes from the last write); Quit game throws the game away', () => {
    const onRetry = vi.fn();
    const { app } = renderWithApp(<PlayCrash onRetry={onRetry} />);
    app.store.startGame(newGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: [{ id: 1, type: 'who_of_two' }] }));

    expect(screen.getByRole('heading', { name: en['crash.title'] })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en['crash.retry'] }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(app.store.get().game).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: en['pause.quit'] }));
    expect(app.store.get().game).toBeNull();
    expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true });
    expectSynced(app.store, app.api);
  });
});
