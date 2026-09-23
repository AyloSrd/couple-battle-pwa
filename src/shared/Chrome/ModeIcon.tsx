import type { FC } from 'react';
import flash128 from '@/assets/art/mode-flash-128.webp';
import flash256 from '@/assets/art/mode-flash-256.webp';
import dilemma128 from '@/assets/art/mode-dilemma-128.webp';
import dilemma256 from '@/assets/art/mode-dilemma-256.webp';
import ultime128 from '@/assets/art/mode-ultime-128.webp';
import ultime256 from '@/assets/art/mode-ultime-256.webp';

export type TModeIconMode = 'flash' | 'dilemma' | 'ultime';

const ICONS: Record<TModeIconMode, { x1: string; x2: string }> = {
  flash: { x1: flash128, x2: flash256 },
  dilemma: { x1: dilemma128, x2: dilemma256 },
  ultime: { x1: ultime128, x2: ultime256 },
};

/** Small (128) icon URL — for chips and headers. */
export function modeIconSmall(mode: TModeIconMode): string {
  return ICONS[mode].x1;
}

/** Mode icon at `size` CSS px: 128 for 1x, 256 for 2x. */
export const ModeIcon: FC<{ mode: TModeIconMode; size?: number; className?: string }> = ({ mode, size = 64, className }) => (
  <img
    className={className}
    src={ICONS[mode].x1}
    srcSet={`${ICONS[mode].x1} 1x, ${ICONS[mode].x2} 2x`}
    width={size}
    height={size}
    alt=""
    draggable={false}
  />
);
