import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';

/** Render a screen with the real language provider and the no-op sound port. */
export function renderScreen(ui: ReactElement, lang: 'fr' | 'en' = 'en') {
  return render(
    <LangProvider initialLang={lang}>
      <SoundApiProvider api={createSoundNoopApi()}>{ui}</SoundApiProvider>
    </LangProvider>,
  );
}
