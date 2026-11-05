import type { FC, ReactNode } from 'react';
import { PixelPanel } from './PixelPanel';
import './chrome.css';

type TSheetProps = {
  /** Accessible name of the dialog (usually the title). */
  label: string;
  /** Visible heading; omit for a text-only confirm. */
  title?: string;
  children: ReactNode;
};

/** Modal sheet over a dimmed screen: pause, confirmations. Lay buttons out as children;
 *  `cb-dialog__text` styles a confirmation question, `cb-row-2` a pair of buttons. */
export const Sheet: FC<TSheetProps> = ({ label, title, children }) => (
  <div className="cb-overlay cb-dialog" role="dialog" aria-modal="true" aria-label={label}>
    <PixelPanel className="cb-sheet">
      {title && <h2 className="cb-h2 cb-center">{title}</h2>}
      {children}
    </PixelPanel>
  </div>
);
