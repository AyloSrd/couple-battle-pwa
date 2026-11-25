import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { renderWithApp } from '@/test/renderApp';
import { PRINCIPLES } from './domain/principles';
import { HowToPlayView } from './index';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}));

const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('HowToPlayView', () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
  });

  it('reads top to bottom: title, the four principles, the modes heading, the carousel', () => {
    renderWithApp(<HowToPlayView />);
    const title = screen.getByRole('heading', { level: 1, name: en['howto.title'] });
    const principles = PRINCIPLES.map((p) => screen.getByRole('heading', { name: en[p.title as keyof typeof en] }));
    const modes = screen.getByRole('heading', { name: en['howto.modes.title'] });
    const carousel = screen.getByRole('region', { name: en['howto.title'] });
    expect(follows(title, principles[0]!)).toBe(true);
    for (let i = 1; i < principles.length; i += 1) expect(follows(principles[i - 1]!, principles[i]!)).toBe(true);
    expect(follows(principles[3]!, modes)).toBe(true);
    expect(follows(modes, carousel)).toBe(true);
    expect(carousel.contains(modes)).toBe(false);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the seating diagram once and keeps the three mode slides', () => {
    renderWithApp(<HowToPlayView />);
    expect(screen.getByRole('img', { name: en['howto.principles.split.alt'] })).toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(3);
  });

  it('the carousel dots still work', () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    renderWithApp(<HowToPlayView />);
    fireEvent.click(screen.getByRole('button', { name: en['howto.dilemma.name'] }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('Back navigates to / with the rules-up view transition', () => {
    renderWithApp(<HowToPlayView />);
    fireEvent.click(screen.getByRole('button', { name: en['common.back'] }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenLastCalledWith({ to: '/', viewTransition: { types: ['rules-up'] } });
  });
});
