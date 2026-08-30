import { filterQuestions } from '../domain/services';
import type { TQuestion } from '../domain/types';
import type { TQuestionsApi } from './index';

/**
 * In-memory catalog for tests. Seed with a small fixture; `lang` is ignored
 * (the fixture stands in for whichever language the test drives).
 */
export function createQuestionsMemoryApi(seed: TQuestion[] = []): TQuestionsApi {
  return {
    async list({ lang: _lang, ...rest }) {
      return filterQuestions(seed, rest);
    },
  };
}
