import type { FC } from 'react';

export type TModeIconMode = 'flash' | 'dilemma' | 'ultime';

const FILES = import.meta.glob('/src/assets/art/mode-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const iconUrl = (mode: TModeIconMode, px: 128 | 256) => FILES[`/src/assets/art/mode-${mode}-${px}.webp`] ?? '';

/** Small (128) icon URL — for chips and headers. */
export function modeIconSmall(mode: TModeIconMode): string {
  return iconUrl(mode, 128);
}

/** Mode icon at `size` CSS px: 128 for 1x, 256 for 2x. */
export const ModeIcon: FC<{ mode: TModeIconMode; size?: number; className?: string }> = ({ mode, size = 64, className }) => (
  <img
    className={className}
    src={iconUrl(mode, 128)}
    srcSet={`${iconUrl(mode, 128)} 1x, ${iconUrl(mode, 256)} 2x`}
    width={size}
    height={size}
    alt=""
    draggable={false}
  />
);
