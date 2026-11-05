import type { ButtonHTMLAttributes, FC, MouseEvent } from 'react';
import { useSound, type TSoundId } from '@/shared/sound';
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
  const sound = useSound();
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (sfx) sound.play(sfx);
    onClick?.(event);
  };
  const shown = initial === undefined ? label.trim().charAt(0).toUpperCase() : initial;
  const classes = [
    'cb-answer',
    tone === 'p2' ? 'cb-answer--p2' : tone === 'neutral' ? 'cb-answer--neutral' : '',
    locked ? 'cb-answer--locked' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={classes} onClick={handleClick} {...rest}>
      {shown && <span className="cb-initial">{shown}</span>}
      {label}
    </button>
  );
};
