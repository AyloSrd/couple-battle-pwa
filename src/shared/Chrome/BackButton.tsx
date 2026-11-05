import type { ButtonHTMLAttributes, FC, MouseEvent } from 'react';
import { useSound, type TSoundId } from '@/shared/sound';
import './chrome.css';

type TBackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Visible label (e.g. `t('common.back')`). */
  label: string;
  /** Sound played on click (default the back blip); `null` = silent. */
  sfx?: TSoundId | null;
};

/** Top-bar back control: gold round arrow + label. */
export const BackButton: FC<TBackButtonProps> = ({ label, className, type = 'button', sfx = 'sfx.back', onClick, ...rest }) => {
  const sound = useSound();
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (sfx) sound.play(sfx);
    onClick?.(event);
  };
  return (
    <button type={type} className={['cb-back', className ?? ''].filter(Boolean).join(' ')} onClick={handleClick} {...rest}>
      <span className="cb-back-icon" aria-hidden="true">
        ←
      </span>
      {label}
    </button>
  );
};
