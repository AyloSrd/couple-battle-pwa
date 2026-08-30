import type { TQuestion, TQuestionFilter } from '../domain/types';

/**
 * Read-only catalog port. No HTTP — adapters read the bundled JSON (or a fixture
 * in tests). `list` picks the language file and applies the filter.
 */
export type TQuestionsApi = {
  list(filter: TQuestionFilter): Promise<TQuestion[]>;
};
