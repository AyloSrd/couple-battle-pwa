import { useEffect, useEffectEvent, type FC, type ReactNode } from 'react';
import { cx } from './kit';
import './chrome.css';

type TNoticeProps = {
  children: ReactNode;
  /** `error` = rose (something went wrong); `info` = mint. */
  tone?: 'info' | 'error';
  action?: { label: string; onClick: () => void };
  /** Hide on its own after this long (calls `onHide`). */
  autoHideMs?: number;
  onHide?: () => void;
};

/** A status line pinned to the bottom (save status, boot issues), in the toast style. Polite
 *  live region: announced once, never steals focus. */
export const Notice: FC<TNoticeProps> = ({ children, tone = 'info', action, autoHideMs, onHide }) => {
  const hide = useEffectEvent(() => onHide?.());
  useEffect(() => {
    if (autoHideMs === undefined) return;
    const id = setTimeout(hide, autoHideMs);
    return () => clearTimeout(id);
  }, [autoHideMs]);

  return (
    <div className="cb-notice" role="status">
      <div className={cx('cb-toast', tone === 'error' && 'cb-toast--error')}>
        <span>{children}</span>
        {action && <button type="button" className="cb-notice-action" onClick={action.onClick}>{action.label}</button>}
      </div>
    </div>
  );
};
