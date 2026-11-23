import { z } from 'zod';
import questionsFr from '@/data/questions.fr.json';
import questionsEn from '@/data/questions.en.json';
import questionsEs from '@/data/questions.es.json';
import questionsIt from '@/data/questions.it.json';
import { ZQuestionSchema } from '../domain/types';
import type { TQuestion } from '../domain/types';
import { filterQuestions } from '../domain/services';
import type { TQuestionsApi } from './index';

const ZQuestionArray = z.array(ZQuestionSchema);

// Keyed by TLang ('fr' | 'en' | 'es' | 'it'); literals here keep the adapter from importing
// another slice's domain.
type TRawByLang = { fr: unknown; en: unknown; es: unknown; it: unknown };

/**
 * Catalog backed by the bundled question JSON. A language is Zod-parsed the first time it is
 * asked for (data crosses the boundary here), then kept: one parse per language per session.
 */
export function createQuestionsJsonApi(
  raw: TRawByLang = { fr: questionsFr, en: questionsEn, es: questionsEs, it: questionsIt },
): TQuestionsApi {
  const parsed: Partial<Record<keyof TRawByLang, TQuestion[]>> = {};
  const bank = (lang: keyof TRawByLang) => (parsed[lang] ??= ZQuestionArray.parse(raw[lang]));

  return {
    list({ lang, ...rest }) {
      return filterQuestions(bank(lang), rest);
    },
  };
}
