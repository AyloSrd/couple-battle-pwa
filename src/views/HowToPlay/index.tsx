import { useEffect, useEffectEvent, useRef, useState, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { Mode, type TMode } from '@/shared/game';
import { Screen, PixelPanel, ModeIcon, TopBar } from '@/shared/Chrome';
import { clampIndex, indexFromKey, indexFromScroll } from './domain/carousel';
import './view.css';

const SLIDES = Object.values(Mode);
const slideKey = (mode: TMode, part: 'name' | 'body'): TStringKey => `howto.${mode}.${part}`;

export const HowToPlayView: FC = () => {
  const t = useT();
  const sound = useSound();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = (target: number) => {
    const el = trackRef.current;
    if (!el) return;
    const next = clampIndex(target, SLIDES.length);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };

  // Arrow keys / Home / End work wherever the focus is on this screen.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = indexFromKey(event.key, index, SLIDES.length);
    if (next === null) return;
    event.preventDefault();
    sound.play('sfx.tap');
    goTo(next);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setIndex(indexFromScroll(el.scrollLeft, el.clientWidth, SLIDES.length));
  };

  const makeDot = (target: number) => () => {
    if (target === index) return;
    sound.play('sfx.tap');
    goTo(target);
  };

  return (
    <Screen className="cb-v-howto">
      <TopBar back="/" />
      <h1 className="cb-title">{t('howto.title')}</h1>

      <div ref={trackRef} className="cb-howto-track" onScroll={handleScroll} role="region" aria-label={t('howto.title')} tabIndex={0}>
        {SLIDES.map((mode) => (
          <PixelPanel key={mode} className="cb-howto-slide" role="group" aria-label={t(slideKey(mode, 'name'))}>
            <div className="cb-howto-art">
              <ModeIcon mode={mode} size={192} />
            </div>
            <h2 className="cb-h2">{t(slideKey(mode, 'name'))}</h2>
            <p className="cb-howto-body">{t(slideKey(mode, 'body'))}</p>
          </PixelPanel>
        ))}
      </div>

      <div className="cb-howto-dots">
        {SLIDES.map((mode, i) => (
          <button
            key={mode}
            type="button"
            className="cb-howto-dot"
            aria-label={t(slideKey(mode, 'name'))}
            aria-current={i === index ? 'true' : undefined}
            onClick={makeDot(i)}
          />
        ))}
      </div>

      <p className="cb-muted cb-center cb-howto-hint">{t('howto.swipe')}</p>
    </Screen>
  );
};
