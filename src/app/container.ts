import { createQuestionsJsonApi } from '@/shared/questions/api/json';
import { createSaveLocalStorageApi } from '@/shared/save/api/localStorage';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import type { TQuestionsApi } from '@/shared/questions';
import type { TSaveApi } from '@/shared/save';

/**
 * The composition root's product: the data ports. This is the ONLY module that names concrete
 * backends (ARCHITECTURE.md). Sound and the wake lock are UI output, not ports: they are not
 * here.
 */
export type TContainer = {
  questionsApi: TQuestionsApi;
  saveApi: TSaveApi;
};

/**
 * Build every adapter once. It only builds: nothing is read or written here (reading is
 * `boot()`'s job). `memory`: an in-memory save (tests, a session where storage is off).
 */
export function createContainer(mode: 'persistent' | 'memory' = 'persistent'): TContainer {
  return {
    questionsApi: createQuestionsJsonApi(),
    saveApi: mode === 'memory' ? createSaveMemoryApi() : createSaveLocalStorageApi(),
  };
}
