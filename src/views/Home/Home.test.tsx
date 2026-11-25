import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { it as italian } from '@/data/strings.it';
import { newGame } from '@/shared/game';
import { createSaveStore } from '@/shared/save';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { createTestApp, TestProviders, type TTestApp } from '@/test/renderApp';
import { expectSynced, seedStorage } from '@/test/expectSynced';
import { HomeView } from './index';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const roster = [{ teamId: 't1', avatarId: 'otters' as const, players: ['A', 'B'] as [string, string] }];
const running = newGame({ roster, mode: 'dilemma', difficulty: 'mix', themes: [], deck: [{ id: 1, type: 'who_of_two' }] });

function mount(app: TTestApp = createTestApp()) {
  render(
    <TestProviders app={app}>
      <HomeView />
    </TestProviders>,
  );
  return app;
}

describe('HomeView — saved game', () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('offers to resume a running game; New game throws it away after a confirm (saved)', () => {
    const app = createTestApp();
    app.store.startGame(running);
    mount(app);
    expect(screen.getByText(en['common.resume.title'])).toBeInTheDocument();

    // S13: Cancel keeps it.
    fireEvent.click(screen.getByRole('button', { name: en['common.resume.no'] }));
    expect(screen.getByRole('dialog', { name: en['home.discard.confirm'] })).toBeInTheDocument();
    expect(app.store.get().game).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en['common.cancel'] }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(app.store.get().game).not.toBeNull();
    expectSynced(app.store, app.api);

    fireEvent.click(screen.getByRole('button', { name: en['common.resume.no'] }));
    fireEvent.click(screen.getByRole('button', { name: en['home.discard.yes'] }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(app.store.get().game).toBeNull();
    expect(screen.queryByText(en['common.resume.title'])).toBeNull();
    expectSynced(app.store, app.api);
  });

  it('the rules entry is one kit button named "How to play": no separate "?" control, every button has a name', () => {
    mount();
    const howto = screen.getByRole('button', { name: en['home.howto'] });
    expect(howto).toHaveClass('cb-btn');
    expect(howto.querySelector('.cb-v-home-howto-label')).toBeNull();
    expect(howto.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(document.querySelector('.cb-v-home-howto-label')).toBeNull();
    expect(screen.queryByRole('button', { name: '?' })).toBeNull();
    for (const button of screen.getAllByRole('button')) expect(button, button.outerHTML).toHaveAccessibleName();
  });

  it('the rules entry navigates to /how-to-play with the rules-down view transition, once per tap', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: en['home.howto'] }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenLastCalledWith({ to: '/how-to-play', viewTransition: { types: ['rules-down'] } });
  });

  it('the settings gear navigates to /settings with no view transition', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: en['home.settings'] }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenLastCalledWith({ to: '/settings' });
    expect(navigate.mock.lastCall?.[0]).not.toHaveProperty('viewTransition');
  });

  it('no other Home navigation passes a view transition (PLAY, Resume)', () => {
    const app = createTestApp();
    app.store.startGame(running);
    mount(app);
    fireEvent.click(screen.getByRole('button', { name: en['common.resume.yes'] }));
    fireEvent.click(screen.getByRole('button', { name: en['home.play'] }));
    expect(navigate).toHaveBeenCalledTimes(2);
    for (const [options] of navigate.mock.calls) expect(options).not.toHaveProperty('viewTransition');
  });

  it('a finished game (kept for its Final screen) is not something to resume', () => {
    const app = createTestApp();
    app.store.startGame({ ...running, step: { kind: 'final' } });
    mount(app);
    expect(screen.queryByText(en['common.resume.title'])).toBeNull();
  });

  it('PLAY starts a fresh draft and leaves a finished game behind', () => {
    const app = createTestApp({ draft: { roster, mode: 'flash' } });
    app.store.startGame({ ...running, step: { kind: 'final' } });
    mount(app);
    fireEvent.click(screen.getByRole('button', { name: en['home.play'] }));
    expect(app.draft.get()).toEqual({ roster: null, mode: null });
    expect(app.store.get().game).toBeNull();
    expect(navigate).toHaveBeenCalledWith({ to: '/setup' });
  });

  it('says once when the last game could not be restored', () => {
    vi.useFakeTimers();
    const base = createTestApp();
    const api = createSaveMemoryApi(seedStorage({ profile: { settings: { lang: 'en', sound: false, vibration: true } }, game: running }));
    const store = createSaveStore(api, api.load());
    store.recover(() => false); // its question is gone from the bank
    mount({ ...base, api, store });
    expect(screen.getByRole('status')).toHaveTextContent(en['save.gameDiscarded']);
    expect(screen.queryByText(en['common.resume.title'])).toBeNull();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(store.get().issues).toEqual([]);
  });
});

describe('HomeView — language menu', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists four languages in LANGS order (Français, English, Español, Italiano); picking Italiano turns Home Italian and saves it', () => {
    const app = mount();
    fireEvent.click(screen.getByRole('button', { name: en['settings.language'] }));
    expect(screen.getAllByRole('button').filter((b) => b.closest('.cb-lang-menu')).map((b) => b.textContent)).toEqual(['Français', 'English', 'Español', 'Italiano']);

    fireEvent.click(screen.getByRole('button', { name: 'Italiano' }));
    expect(screen.getByRole('button', { name: italian['settings.language'] })).toHaveTextContent('IT');
    expect(screen.getByRole('button', { name: italian['home.play'] })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('it');
    expect(app.store.get().profile.settings.lang).toBe('it');
    expectSynced(app.store, app.api);
  });
});
