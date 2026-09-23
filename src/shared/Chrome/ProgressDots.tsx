import type { FC } from 'react';
import './chrome.css';

type TProgressDotsProps = {
  /** Number of steps. */
  total: number;
  /** Zero-based index of the active step (this and earlier steps are lit). */
  current: number;
};

/** Row of progress dots: done + current lit (pink; gold on stage), the rest hollow. */
export const ProgressDots: FC<TProgressDotsProps> = ({ total, current }) => (
  <span className="cb-dots" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
    {Array.from({ length: total }, (_, index) => (
      <i key={index} className={index <= current ? 'on' : undefined} />
    ))}
  </span>
);
