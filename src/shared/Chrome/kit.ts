import { useSound, type TSoundId } from '@/shared/sound';

/** Join the truthy class names. */
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** A click handler that plays `sfx` (`null` = silent), then calls `onClick`. */
export function useSfxClick<E>(sfx: TSoundId | null, onClick: ((event: E) => void) | undefined) {
  const sound = useSound();
  return (event: E) => {
    if (sfx) sound.play(sfx);
    onClick?.(event);
  };
}
