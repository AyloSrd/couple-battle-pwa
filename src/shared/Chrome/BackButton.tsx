import type { ButtonHTMLAttributes, FC } from 'react';
import './chrome.css';

type TBackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Visible label (e.g. `t('common.back')`). */
  label: string;
};

/** Top-bar back control: gold round arrow + label. */
export const BackButton: FC<TBackButtonProps> = ({ label, className, type = 'button', ...rest }) => (
  <button type={type} className={['cb-back', className ?? ''].filter(Boolean).join(' ')} {...rest}>
    <span className="cb-back-icon" aria-hidden="true">
      ←
    </span>
    {label}
  </button>
);
