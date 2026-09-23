import type { ButtonHTMLAttributes, FC } from 'react';
import './chrome.css';

type TAnswerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  /** Partner colour: p1 violet, p2 coral, neutral paper (yes/no, generic picks). */
  tone?: 'p1' | 'p2' | 'neutral';
  /** Leading initial tile; defaults to the label's first letter. Pass `null` for none. */
  initial?: string | null;
  locked?: boolean;
};

/** 66px answer / partner-name button with the initial tile. */
export const AnswerButton: FC<TAnswerButtonProps> = ({ label, tone = 'p1', initial, locked = false, className, ...rest }) => {
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
    <button type="button" className={classes} {...rest}>
      {shown && <span className="cb-initial">{shown}</span>}
      {label}
    </button>
  );
};
