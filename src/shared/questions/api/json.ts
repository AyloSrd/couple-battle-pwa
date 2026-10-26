import { z } from 'zod';
import questionsFr from '@/data/questions.fr.json';
import questionsEn from '@/data/questions.en.json';
import questionsEs from '@/data/questions.es.json';
import { ZQuestionSchema } from '../domain/types';
import type { TQuestion } from '../domain/types';
import { filterQuestions } from '../domain/services';
import type { TQuestionsApi } from './index';

const ZQuestionArray = z.array(ZQuestionSchema);

// Keyed by TLang ('fr' | 'en' | 'es'); literals here keep the adapter from importing
// another slice's domain.
type TRawByLang = { fr: unknown; en: unknown; es: unknown };

/**
 * Catalog backed by the bundled question JSON. Every language is Zod-parsed
 * once at construction (data crosses the boundary here); `list` then picks the
 * language array and applies the pure filter.
 */
export function createQuestionsJsonApi(
  raw: TRawByLang = { fr: questionsFr, en: questionsEn, es: questionsEs },
): TQuestionsApi {
  const byLang: Record<keyof TRawByLang, TQuestion[]> = {
    fr: ZQuestionArray.parse(raw.fr),
    en: ZQuestionArray.parse(raw.en),
    es: ZQuestionArray.parse(raw.es),
  };

  return {
    async list({ lang, ...rest }) {
      return filterQuestions(byLang[lang], rest);
    },
  };
}
