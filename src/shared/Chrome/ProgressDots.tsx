import type { FC } from 'react';
import { Sprite } from './Sprite';
import './chrome.css';

type TProgressDotsProps = {
  /** Number of steps. */
  total: number;
  /** Zero-based index of the active step. */
  current: number;
  size?: number;
};

type TDotState = 'done' | 'current' | 'empty';

function dotState(index: number, current: number): TDotState {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'empty';
}

/** Row of pixel progress dots (done / current / empty). */
export const ProgressDots: FC<TProgressDotsProps> = ({ total, current, size = 8 }) => (
  <div className="cb-dots" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
    {Array.from({ length: total }, (_, index) => (
      <Sprite key={index} name={`ui-dot-${dotState(index, current)}`} size={size} />
    ))}
  </div>
);
