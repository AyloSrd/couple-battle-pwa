import type { ButtonHTMLAttributes, FC } from 'react';
import type { TSoundId } from '@/shared/sound';
import { cx, useSfxClick } from './kit';
import './chrome.css';

/**
 * Button variants: `primary` is the glossy gold CTA (on every screen, burst included),
 * `win` the same gold with a glow, `secondary` the outlined cream button, `ghost`
 * text-only, `positive`/`negative` the mint/rose verdict buttons.
 */
export type TPixelButtonVariant = 'primary' | 'secondary' | 'ghost' | 'win' | 'positive' | 'negative';

type TPixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TPixelButtonVariant;
  /** Full-width (default). `false` = inline, hugging its label. */
  block?: boolean;
  /** Height scale: `md` (default, the token height of the variant) or `lg` (verdict / answer /
   *  start buttons). The only button sizes — views do not patch heights. */
  size?: 'md' | 'lg';
  /** Sound played on click (default the tap blip); `null` = silent (the handler plays its own). */
  sfx?: TSoundId | null;
};

export const PixelButton: FC<TPixelButtonProps> = ({
  variant = 'primary',
  block = true,
  type = 'button',
  className,
  children,
  size = 'md',
  sfx = 'sfx.tap',
  onClick,
  ...rest
}) => {
  const handleClick = useSfxClick(sfx, onClick);
  const classes = cx('cb-btn', variant !== 'primary' && `cb-btn--${variant}`, !block && 'cb-btn--inline', size === 'lg' && 'cb-btn--lg', className);
  return (
    <button type={type} className={classes} onClick={handleClick} {...rest}>{children}</button>
  );
};
