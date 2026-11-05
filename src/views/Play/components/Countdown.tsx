import { useEffect, useState, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { Screen } from '@/shared/Chrome';
import '../dilemma.css';

const STEP_MS = 700;
const GO_MS = 1500;

const GO_KEY = {
  point: 'count.go', // Dilemma: everyone points at someone → "POINTEZ !"
  answer: 'count.go.answer', // rapid-fire: partners answer out loud → "RÉPONDEZ !"
} as const satisfies Record<string, TStringKey>;

/** V-Countdown — the signature beat: numerals slam in with rising ticks, then the GO word for
 *  the mechanic; `onDone` ~1.5 s after GO. Runs once on mount. */
export const Countdown: FC<{ onDone: () => void; ticks?: 3 | 2; go?: keyof typeof GO_KEY }> = ({
  onDone,
  ticks = 3,
  go = 'point',
}) => {
  const t = useT();
  const sound = useSound();
  const digits: (3 | 2 | 1)[] = ticks === 2 ? [2, 1] : [3, 2, 1];
  const [phase, setPhase] = useState(0); // 0..digits.length-1 = digit, digits.length = go
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    digits.forEach((step, idx) => {
      const tick = () => {
        setPhase(idx);
        sound.play('sfx.countdown.tick', { step });
      };
      if (idx === 0) sound.play('sfx.countdown.tick', { step });
      else timers.push(setTimeout(tick, idx * STEP_MS));
    });
    const goAt = digits.length * STEP_MS;
    timers.push(
      setTimeout(() => {
        setPhase(digits.length);
        sound.play('sfx.countdown.go');
      }, goAt),
    );
    timers.push(setTimeout(() => onDone(), goAt + GO_MS));
    return () => timers.forEach(clearTimeout);
    // Mount-only timed sequence; onDone is stable while the countdown is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isGo = phase >= digits.length;
  const digit = digits[phase] ?? 1;

  return (
    <Screen burst center className="cb-v-dilemma cb-v-dilemma--count">
      <div className="cb-glow" aria-hidden="true" />
      {!isGo && (
        // key re-mounts the numeral (and its ring) so the slam replays per tick
        <div key={digit} className="cb-v-count-stage">
          <span className="cb-v-ring" aria-hidden="true" />
          <div className="cb-numeral is-in">{digit}</div>
        </div>
      )}
      {/* One live region for the whole beat: screen readers hear "get ready" at the start and
          the GO word once — never every tick (S11). A plain box: the page centres it like its child. */}
      <div role="status">
        {isGo ? (
          <div className="cb-go cb-reveal-in">{t(GO_KEY[go])}</div>
        ) : (
          <p className="cb-v-get-ready">{t('dilemma.getready')}</p>
        )}
      </div>
    </Screen>
  );
};
