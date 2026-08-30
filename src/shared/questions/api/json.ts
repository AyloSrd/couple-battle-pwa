import { z } from 'zod';
import questionsFr from '@/data/questions.fr.json';
import questionsEn from '@/data/questions.en.json';
import { ZQuestionSchema } from '../domain/types';
import type { TQuestion } from '../domain/types';
import { filterQuestions } from '../domain/services';
import type { TQuestionsApi } from './index';

const ZQuestionArray = z.array(ZQuestionSchema);

// Keyed by TLang ('fr' | 'en'); literals here keep the adapter from importing
// another slice's domain.
type TRawByLang = { fr: unknown; en: unknown };

/**
 * Catalog backed by the bundled question JSON. Both languages are Zod-parsed
 * once at construction (data crosses the boundary here); `list` then picks the
 * language array and applies the pure filter.
 */
export function createQuestionsJsonApi(
  raw: TRawByLang = { fr: questionsFr, en: questionsEn },
): TQuestionsApi {
  const byLang: { fr: TQuestion[]; en: TQuestion[] } = {
    fr: ZQuestionArray.parse(raw.fr),
    en: ZQuestionArray.parse(raw.en),
  };

  return {
    async list({ lang, ...rest }) {
      return filterQuestions(byLang[lang], rest);
    },
  };
}
