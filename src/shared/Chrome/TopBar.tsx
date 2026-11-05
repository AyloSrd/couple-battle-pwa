import type { FC, ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { BackButton } from './BackButton';
import './chrome.css';

/** Where Back leads: a route, or a handler when the screen first steps back inside itself (Setup). */
type TBack = '/' | '/setup' | '/mode' | '/settings' | (() => void);

type TTopBarProps = {
  /** Omit on a screen without Back (Home): the right-hand side keeps its place. */
  back?: TBack;
  /** Right-hand side: progress dots, a chip, the language menu. */
  children?: ReactNode;
};

/** The screen's top bar: Back (with its sound) on the left, `children` on the right. */
export const TopBar: FC<TTopBarProps> = ({ back, children }) => {
  const t = useT();
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof back === 'function') back();
    else if (back) navigate({ to: back });
  };
  return (
    <div className="cb-topbar">
      {back ? <BackButton label={t('common.back')} onClick={handleBack} /> : <span />}
      {children}
    </div>
  );
};
