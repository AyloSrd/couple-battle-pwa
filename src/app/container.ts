import { createQuestionsJsonApi } from '@/shared/questions/api/json';
import { createSaveLocalStorageApi } from '@/shared/save/api/localStorage';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import type { TQuestionsApi } from '@/shared/questions';
import type { TSaveApi } from '@/shared/save';

/** The data ports. The ONLY module naming concrete backends (sound, wake lock: UI output, not here). */
export type TContainer = {
  questionsApi: TQuestionsApi;
  saveApi: TSaveApi;
};

/** Build every adapter once. It only builds: reading is `boot()`'s job. `memory`: tests, storage off. */
export function createContainer(mode: 'persistent' | 'memory' = 'persistent'): TContainer {
  return {
    questionsApi: createQuestionsJsonApi(),
    saveApi: mode === 'memory' ? createSaveMemoryApi() : createSaveLocalStorageApi(),
  };
}
