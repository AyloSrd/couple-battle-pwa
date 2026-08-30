import { createQuestionsJsonApi } from '@/shared/questions/api/json';
import { openSaveDb, createSaveIdbApi } from '@/shared/save/api/idb';
import { createSaveMemoryApi } from '@/shared/save/api/memory';
import { createSoundWebAudioApi } from '@/shared/sound/api/webAudio';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { createWakeLockBrowserApi } from '@/shared/wakeLock/api/browser';
import { createWakeLockNoopApi } from '@/shared/wakeLock/api/noop';
import type { TQuestionsApi } from '@/shared/questions';
import type { TSaveApi } from '@/shared/save';
import type { TSoundApi } from '@/shared/sound';
import type { TWakeLockApi } from '@/shared/wakeLock';

/**
 * The composition root's product. This is the ONLY module that names concrete
 * backends; everything else takes these instances through router context /
 * providers (see ARCHITECTURE.md).
 */
export type TContainer = {
  questionsApi: TQuestionsApi;
  saveApi: TSaveApi;
  soundApi: TSoundApi;
  wakeLockApi: TWakeLockApi;
};

/**
 * Build every adapter once.
 * - `persistent` (default): real IndexedDB / WebAudio / wake lock.
 * - `memory`: memory save + silent sound + no-op wake lock (tests, Storybook,
 *   a new game before first persist). The catalog is always JSON.
 */
export async function createContainer(
  mode: 'persistent' | 'memory' = 'persistent',
): Promise<TContainer> {
  const questionsApi = createQuestionsJsonApi();

  if (mode === 'memory') {
    return {
      questionsApi,
      saveApi: createSaveMemoryApi(),
      soundApi: createSoundNoopApi(),
      wakeLockApi: createWakeLockNoopApi(),
    };
  }

  return {
    questionsApi,
    saveApi: createSaveIdbApi(await openSaveDb()),
    soundApi: createSoundWebAudioApi(),
    wakeLockApi: createWakeLockBrowserApi(),
  };
}
