import { useEffect, useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Sprite } from '@/shared/Chrome';

type TDisplay = '3' | '2' | '1' | 'go';

function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

/**
 * V-Countdown — the game's signature beat. Full ink-dark screen, 3-2-1 digits
 * slam in with rising ticks + haptics, then a burst + "POINTEZ !". Auto-advances
 * (dispatches countdownDone) ~1.5s after GO. Runs once on mount.
 */
export const Countdown: FC<{ onDone: () => void }> = ({ onDone }) => {
  const t = useT();
  const sound = useSoundApi();
  const [display, setDisplay] = useState<TDisplay>('3');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    sound.play('sfx.countdown.tick', { step: 3 });
    vibrate(50);
    timers.push(
      setTimeout(() => {
        setDisplay('2');
        sound.play('sfx.countdown.tick', { step: 2 });
        vibrate(50);
      }, 700),
    );
    timers.push(
      setTimeout(() => {
        setDisplay('1');
        sound.play('sfx.countdown.tick', { step: 1 });
        vibrate(50);
      }, 1400),
    );
    timers.push(
      setTimeout(() => {
        setDisplay('go');
        sound.play('sfx.countdown.go');
        vibrate([60, 40, 60]);
      }, 2100),
    );
    timers.push(setTimeout(() => onDone(), 3600));
    return () => timers.forEach(clearTimeout);
    // Mount-only timed sequence; onDone is stable while the countdown is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--cb-ink)', display: 'grid', placeItems: 'center' }}>
      {display === 'go' ? (
        <div style={{ display: 'grid', gap: 'var(--cb-s5)', justifyItems: 'center' }}>
          <Sprite name="count-burst" width={140} height={140} />
          <div style={{ fontFamily: 'var(--cb-font-display)', color: 'var(--cb-gold)', fontSize: 'var(--cb-fs-title)' }}>
            {t('count.go')}
          </div>
        </div>
      ) : (
        <Sprite name={`count-${display}`} width={120} height={160} />
      )}
    </div>
  );
};
