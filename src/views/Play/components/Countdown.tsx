import { useEffect, useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Sprite } from '@/shared/Chrome';

function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

const STEP_MS = 700;
const GO_MS = 1500;

function stepOf(digit: string): 3 | 2 | 1 {
  return digit === '3' ? 3 : digit === '2' ? 2 : 1;
}

/**
 * V-Countdown — the game's signature beat. Full ink-dark screen, digits slam in
 * with rising ticks + haptics, then a burst + "POINTEZ !". Auto-advances
 * (dispatches countdownDone) ~1.5s after GO. `ticks` = 3 (Dilemma) or 2
 * (rapid-fire). Runs once on mount.
 */
export const Countdown: FC<{ onDone: () => void; ticks?: number }> = ({ onDone, ticks = 3 }) => {
  const t = useT();
  const sound = useSoundApi();
  const digits = ticks === 2 ? ['2', '1'] : ['3', '2', '1'];
  const [phase, setPhase] = useState(0); // 0..digits.length-1 = digit, digits.length = go

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const first = digits[0] ?? '1';
    sound.play('sfx.countdown.tick', { step: stepOf(first) });
    vibrate(50);
    for (let idx = 1; idx < digits.length; idx++) {
      const d = digits[idx] ?? '1';
      timers.push(
        setTimeout(() => {
          setPhase(idx);
          sound.play('sfx.countdown.tick', { step: stepOf(d) });
          vibrate(50);
        }, idx * STEP_MS),
      );
    }
    const goAt = digits.length * STEP_MS;
    timers.push(
      setTimeout(() => {
        setPhase(digits.length);
        sound.play('sfx.countdown.go');
        vibrate([60, 40, 60]);
      }, goAt),
    );
    timers.push(setTimeout(() => onDone(), goAt + GO_MS));
    return () => timers.forEach(clearTimeout);
    // Mount-only timed sequence; onDone is stable while the countdown is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGo = phase >= digits.length;
  const digit = digits[phase] ?? '1';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--cb-ink)', display: 'grid', placeItems: 'center' }}>
      {isGo ? (
        <div style={{ display: 'grid', gap: 'var(--cb-s5)', justifyItems: 'center' }}>
          <Sprite name="count-burst" width={140} height={140} />
          <div style={{ fontFamily: 'var(--cb-font-display)', color: 'var(--cb-gold)', fontSize: 'var(--cb-fs-title)' }}>
            {t('count.go')}
          </div>
        </div>
      ) : (
        <Sprite name={`count-${digit}`} width={120} height={160} />
      )}
    </div>
  );
};
