import type { ButtonHTMLAttributes, FC } from 'react';
import type { TSoundId } from '@/shared/sound';
import { cx, useSfxClick } from './kit';
import './chrome.css';

type TAnswerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  /** Partner colour: p1 violet, p2 pastel pink, neutral paper (yes/no, generic picks). */
  tone?: 'p1' | 'p2' | 'neutral';
  /** Leading initial tile; defaults to the label's first letter. Pass `null` for none. */
  initial?: string | null;
  locked?: boolean;
  /** Sound played on click (default the tap blip); `null` = silent (the handler plays its own). */
  sfx?: TSoundId | null;
};

/** 66px answer / partner-name button with the initial tile. */
export const AnswerButton: FC<TAnswerButtonProps> = ({
  label,
  tone = 'p1',
  initial,
  locked = false,
  className,
  sfx = 'sfx.tap',
  onClick,
  ...rest
}) => {
  const handleClick = useSfxClick(sfx, onClick);
  const shown = initial === undefined ? label.trim().charAt(0).toUpperCase() : initial;
  const classes = cx('cb-answer', tone !== 'p1' && `cb-answer--${tone}`, locked && 'cb-answer--locked', className);
  return (
    <button type="button" className={classes} onClick={handleClick} {...rest}>
      {shown && <span className="cb-initial">{shown}</span>}
      {label}
    </button>
  );
};
