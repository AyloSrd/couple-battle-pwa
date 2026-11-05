export { SaveApiProvider, useSaveApi } from './provider';
export { useGetSave, saveQueryOptions, saveKeys } from './application/queries';
export { usePutSave } from './application/mutations';
export {
  ZSettingsSchema,
  ZGameSnapshotSchema,
  SAVE_DEFAULTS,
  SAVE_SCHEMAS,
  type TSettings,
  type TSeenQuestionIds,
  type TGuidelinesSeen,
  type TSoloBest,
  type TGameSnapshot,
  type THistoryEntry,
  type TSaveShape,
  type TSaveKey,
} from './domain/types';
export { newGameSnapshot } from './domain/services';
export type { TSaveApi } from './api';
