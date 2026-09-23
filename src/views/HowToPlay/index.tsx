import { useRef, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, PixelButton, ProgressDots, ModeIcon, type TModeIconMode } from '@/shared/Chrome';

type TCard = { titleKey: TStringKey; bodyKey: TStringKey; mode: TModeIconMode };

const CARDS: TCard[] = [
  { titleKey: 'howto.flash.title', bodyKey: 'howto.flash.body', mode: 'flash' },
  { titleKey: 'howto.dilemma.title', bodyKey: 'howto.dilemma.body', mode: 'dilemma' },
  { titleKey: 'howto.ultime.title', bodyKey: 'howto.ultime.body', mode: 'ultime' },
];

export const HowToPlayView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const handleBack = () => {
    sound.play('sfx.back');
    navigate({ to: '/' });
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  };

  return (
    <Screen>
      <div className="cb-topbar">
        <PixelButton variant="ghost" block={false} onClick={handleBack}>
          ← {t('common.back')}
        </PixelButton>
        <ProgressDots total={CARDS.length} current={index} />
      </div>
      <h1 className="cb-title">{t('howto.title')}</h1>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          gap: 'var(--cb-s4)',
          scrollbarWidth: 'none',
          padding: 'var(--cb-s1)',
        }}
      >
        {CARDS.map((card) => (
          <PixelPanel
            key={card.titleKey}
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'center',
              display: 'grid',
              gap: 'var(--cb-s3)',
              justifyItems: 'center',
              textAlign: 'center',
            }}
          >
            <ModeIcon mode={card.mode} size={96} />
            <h2 className="cb-h2">{t(card.titleKey)}</h2>
            <p className="cb-body-lg">{t(card.bodyKey)}</p>
          </PixelPanel>
        ))}
      </div>

      <p className="cb-muted cb-center" style={{ margin: 0 }}>
        {t('howto.swipe')}
      </p>
    </Screen>
  );
};
