import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { en } from '@/data/strings.en';
import { renderWithApp } from '@/test/renderApp';
import { ModesCarousel } from './ModesCarousel';

const WIDTH = 300;
const scrollTo = vi.fn();
const MODES = [en['howto.flash.name'], en['howto.dilemma.name'], en['howto.ultime.name']];

function mount() {
  renderWithApp(<ModesCarousel />);
  const track = screen.getByRole('region');
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: WIDTH });
  return track;
}
const lastLeft = () => (scrollTo.mock.lastCall?.[0] as { left: number } | undefined)?.left;

describe('ModesCarousel', () => {
  beforeEach(() => {
    scrollTo.mockClear();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('has one focusable region, one slide per mode, one dot per mode and the swipe hint', () => {
    const track = mount();
    expect(track).toHaveAttribute('tabindex', '0');
    for (const name of MODES) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(screen.getByText(en['howto.swipe'])).toBeInTheDocument();
  });

  it('the dots scroll to their slide and the scroll position marks the current dot', () => {
    const track = mount();
    fireEvent.click(screen.getByRole('button', { name: en['howto.ultime.name'] }));
    expect(lastLeft()).toBe(2 * WIDTH);
    expect(screen.getByRole('button', { name: en['howto.flash.name'] })).toHaveAttribute('aria-current', 'true');
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 2 * WIDTH });
    fireEvent.scroll(track);
    expect(screen.getByRole('button', { name: en['howto.ultime.name'] })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: en['howto.flash.name'] })).not.toHaveAttribute('aria-current');
  });

  it('ArrowRight / ArrowLeft / End / Home on the focused carousel move it', () => {
    const track = mount();
    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(lastLeft()).toBe(WIDTH);
    fireEvent.keyDown(track, { key: 'End' });
    expect(lastLeft()).toBe(2 * WIDTH);
    scrollTo.mockClear();
    fireEvent.keyDown(track, { key: 'Home' });
    expect(scrollTo).toHaveBeenCalledTimes(0); // already on the first slide: nothing to do
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 2 * WIDTH });
    fireEvent.scroll(track);
    fireEvent.keyDown(track, { key: 'ArrowLeft' });
    expect(lastLeft()).toBe(WIDTH);
    fireEvent.keyDown(track, { key: 'Home' });
    expect(lastLeft()).toBe(0);
  });

  it('the same keys on window or the body do nothing (they scroll the page elsewhere)', () => {
    mount();
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      fireEvent.keyDown(window, { key });
      fireEvent.keyDown(document, { key });
      fireEvent.keyDown(document.body, { key });
    }
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves no keydown listener on window, while mounted or after', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const view = renderWithApp(<ModesCarousel />);
    expect(add.mock.calls.some(([type]) => type === 'keydown')).toBe(false);
    view.unmount();
    add.mockRestore();
  });

  it('ignores keys with a modifier and non-carousel keys on the track', () => {
    const track = mount();
    fireEvent.keyDown(track, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(track, { key: 'a' });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
