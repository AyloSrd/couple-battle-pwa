import type { TQuestion, TQuestionFilter } from '../domain/types';

/**
 * Read-only catalog port. No HTTP: adapters read the bundled JSON (or a fixture in tests).
 * Synchronous: the bank is bundled, so a screen reads it during render (no loading state).
 * `list` picks the language and applies the filter.
 */
export type TQuestionsApi = {
  list(filter: TQuestionFilter): TQuestion[];
};
