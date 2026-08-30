import type { ButtonHTMLAttributes, FC } from 'react';
import './chrome.css';

export type TPixelButtonVariant =
  | 'default'
  | 'primary'
  | 'positive'
  | 'gold'
  | 'negative'
  | 'ghost';

type TPixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TPixelButtonVariant;
  /** Full-width block button. */
  block?: boolean;
};

const VARIANT_CLASS: Record<TPixelButtonVariant, string> = {
  default: '',
  primary: 'cb-btn--primary',
  positive: 'cb-btn--positive',
  gold: 'cb-btn--gold',
  negative: 'cb-btn--negative',
  ghost: 'cb-btn--ghost',
};

export const PixelButton: FC<TPixelButtonProps> = ({
  variant = 'default',
  block = false,
  type = 'button',
  className,
  children,
  ...rest
}) => {
  const classes = [
    'cb-btn',
    VARIANT_CLASS[variant],
    block ? 'cb-btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
};
