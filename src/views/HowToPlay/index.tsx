import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { Screen, TopBar } from '@/shared/Chrome';
import { Principles } from './components/Principles';
import { ModesCarousel } from './components/ModesCarousel';
import './view.css';

export const HowToPlayView: FC = () => {
  const t = useT();
  const navigate = useNavigate();

  // Back is the reverse of Home's entry: the page slides back down (see styles/global.css).
  const handleBack = () => navigate({ to: '/', viewTransition: { types: ['rules-up'] } });

  return (
    <Screen className="cb-v-howto">
      <TopBar back={handleBack} />
      <h1 className="cb-title">{t('howto.title')}</h1>
      <Principles />
      <h2 className="cb-howto-modes-title">{t('howto.modes.title')}</h2>
      <ModesCarousel />
    </Screen>
  );
};
