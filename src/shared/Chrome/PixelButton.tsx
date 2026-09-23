import type { ButtonHTMLAttributes, FC } from 'react';
import './chrome.css';

/**
 * Button variants (v2): `primary` is the violet CTA (turns gold on the Spotlight
 * stage), `win` the gold gradient, `secondary` the outlined paper button, `ghost`
 * text-only, `positive`/`negative` the success/coral verdict buttons.
 */
export type TPixelButtonVariant = 'primary' | 'secondary' | 'ghost' | 'win' | 'positive' | 'negative';

type TPixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TPixelButtonVariant;
  /** Full-width (default). `false` = inline, hugging its label. */
  block?: boolean;
};

const VARIANT_CLASS: Record<TPixelButtonVariant, string> = {
  primary: '',
  secondary: 'cb-btn--secondary',
  ghost: 'cb-btn--ghost',
  win: 'cb-btn--win',
  positive: 'cb-btn--positive',
  negative: 'cb-btn--negative',
};

export const PixelButton: FC<TPixelButtonProps> = ({
  variant = 'primary',
  block = true,
  type = 'button',
  className,
  children,
  ...rest
}) => {
  const classes = ['cb-btn', VARIANT_CLASS[variant], block ? '' : 'cb-btn--inline', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
};
