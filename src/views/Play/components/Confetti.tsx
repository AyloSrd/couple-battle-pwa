import { useEffect, useRef, type FC } from 'react';
import '../results.css';

const PIECES = 90;
const DURATION_MS = 2600;
/** Palette tokens (read from CSS so the confetti follows the theme), with their values as fallback. */
const COLORS: [string, string][] = [
  ['--cb-gold', '#FFC21F'],
  ['--cb-pink', '#FF3FA4'],
  ['--cb-mint', '#4FD99A'],
  ['--cb-violet-600', '#5420E8'],
];

type TPiece = { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; color: string };

/**
 * GF5 — one burst of confetti on a 2D canvas over the Final screen, from the moment it mounts
 * (with `sfx.confetti`). ~2.6 s of `requestAnimationFrame`, then the canvas clears itself; the
 * frame is cancelled and the canvas released on unmount. Not mounted under reduced motion.
 */
export const Confetti: FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(canvas);
    const palette = COLORS.map(([token, fallback]) => css.getPropertyValue(token).trim() || fallback);
    const pieces: TPiece[] = Array.from({ length: PIECES }, (_, i) => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.32,
      vx: (Math.random() - 0.5) * 10,
      vy: -4 - Math.random() * 11,
      size: 6 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: palette[i % palette.length] ?? '#FFC21F',
    }));

    let frame = 0;
    let start = 0;
    let last = 0;
    const draw = (now: number) => {
      if (!start) start = last = now;
      const dt = Math.min(3, (now - last) / 16.7); // in 60 fps frames, capped after a stall
      last = now;
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      if (elapsed >= DURATION_MS) return;
      ctx.globalAlpha = Math.min(1, (DURATION_MS - elapsed) / 600); // fade out over the last 600 ms
      for (const p of pieces) {
        p.vy += 0.32 * dt;
        p.vx *= 0.992;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      canvas.width = 0; // release the bitmap
      canvas.height = 0;
    };
  }, []);

  return <canvas ref={ref} className="cb-confetti" aria-hidden="true" />;
};
