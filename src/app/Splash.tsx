import { useEffect, useEffectEvent, useRef, useState, type FC } from 'react';
import { useT } from '@/shared/i18n';
import { warmMediaCache } from './warmMediaCache';
import './splash.css';

const BASE = import.meta.env.BASE_URL;
export const SPLASH_VIDEO_URL = `${BASE}splash/ninou.mp4`;
const SPLASH_POSTER_URL = `${BASE}splash/ninou-poster.webp`;

/** The video must be `playing` within this long, or we go straight to Home. */
export const START_TIMEOUT_MS = 1500;
/** Safety net once playing: the clip is ~4 s; never hold the app hostage past this. */
export const PLAYBACK_CAP_MS = 8000;
/** Reduced motion: how long the still poster stays up. */
export const POSTER_HOLD_MS = 900;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

type TSplashProps = {
  /** Called exactly once, when the splash ends for any reason (end, tap, error, timeout). */
  onDone: () => void;
};

/**
 * The Ninou boot splash, ahead of the router: a muted inline video on black. It never
 * blocks the app — a tap, the end of the clip, an `error` / `stalled`, a rejected
 * `play()`, or no `playing` within START_TIMEOUT_MS all hand off immediately (an offline
 * first launch has no cached video). Reduced motion shows the poster briefly instead.
 * After it finishes, the media cache is warmed once so the next launch plays offline.
 */
export const Splash: FC<TSplashProps> = ({ onDone }) => {
  const t = useT();
  const [reduced] = useState(prefersReducedMotion);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimeout(timerRef.current);
    const video = videoRef.current;
    if (video) {
      // Release the media element (and abort any in-flight request) before unmount.
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (!reduced) void warmMediaCache(SPLASH_VIDEO_URL);
    onDone();
  };

  // Timer + play() fire from outside React, so they must see the latest `finish`.
  const onTimeout = useEffectEvent(() => finish());
  const onPlayRejected = useEffectEvent(() => finish());

  // One watchdog at a time: the start timeout until `playing`, then the playback cap.
  useEffect(() => {
    const ms = reduced ? POSTER_HOLD_MS : playing ? PLAYBACK_CAP_MS : START_TIMEOUT_MS;
    timerRef.current = setTimeout(onTimeout, ms);
    return () => clearTimeout(timerRef.current);
  }, [reduced, playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // React sets `muted` as a property after insertion; autoplay policies need it first.
    video.muted = true;
    // Older engines return undefined; a rejection means autoplay was refused.
    void video.play()?.catch(onPlayRejected);
  }, []);

  const handlePlaying = () => setPlaying(true);

  return (
    <div className="cb-splash">
      {reduced ? (
        <img className="cb-splash-media" src={SPLASH_POSTER_URL} alt="" draggable={false} />
      ) : (
        <video
          ref={videoRef}
          className="cb-splash-media"
          src={SPLASH_VIDEO_URL}
          poster={SPLASH_POSTER_URL}
          muted
          autoPlay
          playsInline
          preload="auto"
          aria-hidden="true"
          onPlaying={handlePlaying}
          onEnded={finish}
          onError={finish}
          onStalled={finish}
        />
      )}
      <button type="button" className="cb-splash-skip" aria-label={t('splash.skip')} onClick={finish} />
    </div>
  );
};
