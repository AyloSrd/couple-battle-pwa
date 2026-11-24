import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PRIVACY_URL } from '@/shared/legal';
import { Screen, PixelPanel, Chevron, Logo, TopBar } from '@/shared/Chrome';
import './view.css';

export const LegalView: FC = () => {
  const t = useT();

  return (
    <Screen className="cb-v-legal">
      <TopBar back="/settings" />
      <Logo alt={t('app.name')} small />
      <h1 className="cb-title">{t('legal.title')}</h1>
      <PixelPanel className="cb-v-body">
        <p className="cb-body-lg">{t('legal.body')}</p>
      </PixelPanel>
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="cb-mode cb-v-nav">
        <span className="cb-label">{t('legal.privacy')}</span>
        <Chevron />
      </a>
    </Screen>
  );
};
