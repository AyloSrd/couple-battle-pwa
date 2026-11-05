import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from './kit';
import './chrome.css';

type TFieldProps = InputHTMLAttributes<HTMLInputElement>;

/** 56px text field, violet focus ring. */
export const Field = forwardRef<HTMLInputElement, TFieldProps>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cx('cb-field', className)} {...rest} />
));
Field.displayName = 'Field';
