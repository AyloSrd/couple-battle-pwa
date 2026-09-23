import { useEffect, useState, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Screen } from '@/shared/Chrome';

function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

const STEP_MS = 700;
const GO_MS = 1500;

function stepOf(digit: string): 3 | 2 | 1 {
  return digit === '3' ? 3 : digit === '2' ? 2 : 1;
}

/** What the GO beat shouts — the mechanic differs per context. */
export type TCountdownGo = 'point' | 'answer';

const GO_KEY = {
  point: 'count.go', // Dilemma: everyone points at someone → "POINTEZ !"
  answer: 'count.go.answer', // rapid-fire: partners answer out loud → "RÉPONDEZ !"
} as const satisfies Record<TCountdownGo, TStringKey>;

/**
 * V-Countdown — the game's signature beat, on the Spotlight stage. Numerals slam
 * in with rising ticks + haptics, then the GO word. Auto-advances (dispatches
 * countdownDone) ~1.5s after GO. `ticks` = 3 (Dilemma) or 2 (rapid-fire); `go`
 * picks the GO word for the mechanic (default: point). Ticks, haptics and
 * timing are identical in every context. Runs once on mount.
 */
export const Countdown: FC<{ onDone: () => void; ticks?: number; go?: TCountdownGo }> = ({
  onDone,
  ticks = 3,
  go = 'point',
}) => {
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
    <Screen stage center>
      <div className="cb-glow" aria-hidden="true" />
      {isGo ? (
        <div className="cb-go cb-reveal-in" role="status">
          {t(GO_KEY[go])}
        </div>
      ) : (
        <>
          {/* key re-mounts the numeral so the slam replays per tick */}
          <div key={digit} className="cb-numeral is-in" aria-live="assertive">
            {digit}
          </div>
          <p className="cb-muted" style={{ marginTop: 'var(--cb-s6)', fontSize: 'var(--cb-fs-label)' }}>
            {t('dilemma.getready')}
          </p>
        </>
      )}
    </Screen>
  );
};
