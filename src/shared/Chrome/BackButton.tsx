import type { ButtonHTMLAttributes, FC } from 'react';
import type { TSoundId } from '@/shared/sound';
import { cx, useSfxClick } from './kit';
import './chrome.css';

type TBackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Visible label (e.g. `t('common.back')`). */
  label: string;
  /** Sound played on click (default the back blip); `null` = silent. */
  sfx?: TSoundId | null;
};

/** Top-bar back control: gold round arrow + label. */
export const BackButton: FC<TBackButtonProps> = ({ label, className, type = 'button', sfx = 'sfx.back', onClick, ...rest }) => {
  const handleClick = useSfxClick(sfx, onClick);
  return (
    <button type={type} className={cx('cb-back', className)} onClick={handleClick} {...rest}>
      <span className="cb-back-icon" aria-hidden="true">←</span>
      {label}
    </button>
  );
};
