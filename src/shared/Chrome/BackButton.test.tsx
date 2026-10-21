import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackButton } from './BackButton';

describe('BackButton', () => {
  it('is a button named by its label only — the arrow glyph is decorative', () => {
    render(<BackButton label="Retour" />);
    const btn = screen.getByRole('button', { name: 'Retour' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('cb-back');
    expect(btn.querySelector('.cb-back-icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards the click handler and extra classes', () => {
    const onClick = vi.fn();
    render(<BackButton label="Back" onClick={onClick} className="extra" />);
    const btn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(btn).toHaveClass('cb-back', 'extra');
  });
});
