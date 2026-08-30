import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TSaveKey, TSaveShape } from '../domain/types';
import { useSaveApi } from '../provider';
import { saveKeys } from './queries';

/** Persist one save key. Invalidates that key's query on success. */
export function usePutSave<K extends TSaveKey>(key: K) {
  const api = useSaveApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: TSaveShape[K]) => api.put(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saveKeys.byKey(key) });
    },
  });
}
