import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import './chrome.css';

type TChipProps = {
  children: ReactNode;
  /** Optional 18px icon (e.g. a mode icon) before the label. */
  icon?: string | undefined;
  className?: string;
};

/** Overline chip: uppercase Inter, pink on pink-tint paper, on every background. */
export const Chip: FC<TChipProps> = ({ children, icon, className }) => (
  <span className={['cb-chip', className ?? ''].filter(Boolean).join(' ')}>
    {icon && <img src={icon} alt="" />}
    {children}
  </span>
);

/** Tappable chip (language toggle etc.) — same look, ≥ 48px hit area via padding. */
export const ChipButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, children, ...rest }) => (
  <button type="button" className={['cb-chip', className ?? ''].filter(Boolean).join(' ')} {...rest}>
    {children}
  </button>
);
