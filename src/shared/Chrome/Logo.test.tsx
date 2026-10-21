import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('reserves its intrinsic size so Home does not jump when it decodes', () => {
    render(<Logo alt="Couple Battle" />);
    const img = screen.getByRole('img', { name: 'Couple Battle' });
    // logo-480.webp is 480×373 (logo-960 is the same ratio at 2x).
    expect(img).toHaveAttribute('width', '480');
    expect(img).toHaveAttribute('height', '373');
    expect(img.getAttribute('srcset')).toMatch(/ 1x, .+ 2x$/);
  });
});
