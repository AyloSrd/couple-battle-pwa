import type { ComponentProps, FC, MouseEvent, ReactNode } from 'react';
import { useSound, type TSoundId } from '@/shared/sound';
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

type TChipButtonProps = ComponentProps<'button'> & {
  /** Sound played on click (default the tap blip); `null` = silent. */
  sfx?: TSoundId | null;
};

/** Tappable chip (language toggle etc.) — same look, ≥ 48px hit area via padding. */
export const ChipButton: FC<TChipButtonProps> = ({ className, children, sfx = 'sfx.tap', onClick, ...rest }) => {
  const sound = useSound();
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (sfx) sound.play(sfx);
    onClick?.(event);
  };
  return (
    <button type="button" className={['cb-chip', className ?? ''].filter(Boolean).join(' ')} onClick={handleClick} {...rest}>
      {children}
    </button>
  );
};
