import type { ComponentProps, FC, ReactNode } from 'react';
import type { TSoundId } from '@/shared/sound';
import { cx, useSfxClick } from './kit';
import './chrome.css';

type TChipProps = {
  children: ReactNode;
  /** Optional 18px icon (e.g. a mode icon) before the label. */
  icon?: string | undefined;
  className?: string;
};

/** Overline chip: uppercase Inter, pink on pink-tint paper, on every background. */
export const Chip: FC<TChipProps> = ({ children, icon, className }) => (
  <span className={cx('cb-chip', className)}>
    {icon && <img src={icon} alt="" />}
    {children}
  </span>
);

type TChipButtonProps = ComponentProps<'button'> & {
  /** Sound played on click (default the tap blip); `null` = silent. */
  sfx?: TSoundId | null;
};

/** Tappable chip (language toggle etc.) — same look, ≥ 48px hit area via padding. */
export const ChipButton: FC<TChipButtonProps> = ({ className, children, sfx = 'sfx.tap', onClick, ...rest }) => {
  const handleClick = useSfxClick(sfx, onClick);
  return (
    <button type="button" className={cx('cb-chip', className)} onClick={handleClick} {...rest}>{children}</button>
  );
};
