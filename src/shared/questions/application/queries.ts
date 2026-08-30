import { queryOptions, useQuery } from '@tanstack/react-query';
import type { TQuestionsApi } from '../api';
import type { TQuestionFilter } from '../domain/types';
import { useQuestionsApi } from '../provider';

export const questionKeys = {
  all: ['questions'] as const,
  list(filter: TQuestionFilter) {
    return ['questions', 'list', filter] as const;
  },
};

export function questionsListQueryOptions(api: TQuestionsApi, filter: TQuestionFilter) {
  return queryOptions({
    queryKey: questionKeys.list(filter),
    queryFn: () => api.list(filter),
    staleTime: Infinity, // bundled JSON does not change at runtime
  });
}

export function useListQuestions(filter: TQuestionFilter) {
  const api = useQuestionsApi();
  return useQuery(questionsListQueryOptions(api, filter));
}
