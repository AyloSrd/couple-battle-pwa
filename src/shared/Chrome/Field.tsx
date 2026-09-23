import { forwardRef, type InputHTMLAttributes } from 'react';
import './chrome.css';

type TFieldProps = InputHTMLAttributes<HTMLInputElement>;

/** 56px text field, violet focus ring. */
export const Field = forwardRef<HTMLInputElement, TFieldProps>(({ className, ...rest }, ref) => (
  <input ref={ref} className={['cb-field', className ?? ''].filter(Boolean).join(' ')} {...rest} />
));
Field.displayName = 'Field';
