import type { ReactElement } from 'react';
import type { TLang } from '@/shared/i18n';
import { renderWithApp } from './renderApp';

/** Render a screen with the real language provider and a memory save store (sound is silent in jsdom). */
export function renderScreen(ui: ReactElement, lang: TLang = 'en') {
  return renderWithApp(ui, { lang });
}
