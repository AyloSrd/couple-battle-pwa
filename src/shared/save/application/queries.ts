import { queryOptions, useQuery } from '@tanstack/react-query';
import type { TSaveApi } from '../api';
import type { TSaveKey } from '../domain/types';
import { useSaveApi } from '../provider';

export const saveKeys = {
  all: ['save'] as const,
  byKey(key: TSaveKey) {
    return ['save', key] as const;
  },
};

export function saveQueryOptions<K extends TSaveKey>(api: TSaveApi, key: K) {
  return queryOptions({
    queryKey: saveKeys.byKey(key),
    queryFn: () => api.get(key),
  });
}

export function useGetSave<K extends TSaveKey>(key: K) {
  const api = useSaveApi();
  return useQuery(saveQueryOptions(api, key));
}
