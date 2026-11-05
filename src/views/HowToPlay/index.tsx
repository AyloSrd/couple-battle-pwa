import { useEffect, useEffectEvent, useRef, useState, type FC } from 'react';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSound } from '@/shared/sound';
import { Screen, PixelPanel, ModeIcon, TopBar, type TModeIconMode } from '@/shared/Chrome';
import { clampIndex, indexFromKey, indexFromScroll } from './domain/carousel';
import './view.css';

type TSlide = { nameKey: TStringKey; bodyKey: TStringKey; mode: TModeIconMode };

const SLIDES = [
  { nameKey: 'howto.flash.name', bodyKey: 'howto.flash.body', mode: 'flash' },
  { nameKey: 'howto.dilemma.name', bodyKey: 'howto.dilemma.body', mode: 'dilemma' },
  { nameKey: 'howto.ultime.name', bodyKey: 'howto.ultime.body', mode: 'ultime' },
] as const satisfies readonly TSlide[];

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

      <div
        ref={trackRef}
        className="cb-howto-track"
        onScroll={handleScroll}
        role="region"
        aria-label={t('howto.title')}
        tabIndex={0}
      >
        {SLIDES.map((slide) => (
          <PixelPanel key={slide.nameKey} className="cb-howto-slide" role="group" aria-label={t(slide.nameKey)}>
            <div className="cb-howto-art">
              <ModeIcon mode={slide.mode} size={192} />
            </div>
            <h2 className="cb-h2">{t(slide.nameKey)}</h2>
            <p className="cb-howto-body">{t(slide.bodyKey)}</p>
          </PixelPanel>
        ))}
      </div>

      <div className="cb-howto-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.nameKey}
            type="button"
            className="cb-howto-dot"
            aria-label={t(slide.nameKey)}
            aria-current={i === index ? 'true' : undefined}
            onClick={makeDot(i)}
          />
        ))}
      </div>

      <p className="cb-muted cb-center cb-howto-hint">{t('howto.swipe')}</p>
    </Screen>
  );
};
