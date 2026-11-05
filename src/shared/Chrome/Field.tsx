import type { ComponentProps, FC } from 'react';
import { cx } from './kit';
import './chrome.css';

export const Field: FC<ComponentProps<'input'>> = ({ className, ...rest }) => <input className={cx('cb-field', className)} {...rest} />;
