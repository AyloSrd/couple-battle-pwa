import type { CSSProperties, FC } from 'react';

/** A pixel sprite from /public/sprites, always rendered crisp. */
export type TSpriteProps = {
  /** Sprite filename without extension, e.g. `ui-heart`, `avatar-otters`. */
  name: string;
  /** Square size shortcut (sets width and height). */
  size?: number;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

export const Sprite: FC<TSpriteProps> = ({
  name,
  size,
  width,
  height,
  alt = '',
  className,
  style,
}) => (
  <img
    className={className}
    src={`${import.meta.env.BASE_URL}sprites/${name}.svg`}
    alt={alt}
    width={width ?? size}
    height={height ?? size}
    draggable={false}
    style={{ imageRendering: 'pixelated', ...style }}
  />
);
