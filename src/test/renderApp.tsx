import { StrictMode, type FC, type ReactElement, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { AppProviders } from '@/app/Shell';
import type { TBooted } from '@/app/boot';
import { createQuestionsMemoryApi } from '@/shared/questions/api/memory';
import { createDraftStore, type TDraft } from '@/shared/session';
import type { TLang } from '@/shared/i18n';
import type { TQuestion } from '@/shared/questions';
import { bootTestSave } from './expectSynced';

type TTestAppOptions = {
  /** What storage holds before boot (a previous session). */
  seed?: Parameters<typeof bootTestSave>[0];
  /** UI language (saved settings); default English. */
  lang?: TLang;
  questions?: TQuestion[];
  draft?: Partial<TDraft>;
};

/**
 * The app as `boot()` builds it, over memory storage and a fixture bank: a real save store
 * (so tests can `expectSynced`), a draft, the questions port.
 */
export function createTestApp({ seed = {}, lang = 'en', questions = [], draft = {} }: TTestAppOptions = {}) {
  const profile = { ...seed.profile, settings: { lang, sound: true, vibration: true, ...seed.profile?.settings } };
  const { api, store, storage } = bootTestSave({ ...seed, profile });
  const draftStore = createDraftStore();
  draftStore.set(draft);
  const app: TBooted = { container: { questionsApi: createQuestionsMemoryApi(questions), saveApi: api }, store, draft: draftStore };
  return { ...app, api, storage };
}

export type TTestApp = ReturnType<typeof createTestApp>;

/** The app's provider stack around `children` (no router). */
export const TestProviders: FC<{ app: TTestApp; children: ReactNode }> = ({ app, children }) => (
  <AppProviders container={app.container} store={app.store} draft={app.draft}>
    {children}
  </AppProviders>
);

/** Render a screen inside the app providers; StrictMode on request (leak tests). */
export function renderWithApp(ui: ReactElement, options: TTestAppOptions & { strict?: boolean } = {}) {
  const app = createTestApp(options);
  const tree = <TestProviders app={app}>{ui}</TestProviders>;
  const view = render(options.strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { ...view, app };
}
