import { useRef, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT, type TStringKey } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { Screen, PixelPanel, PixelButton, ProgressDots, Sprite } from '@/shared/Chrome';

type TCard = { titleKey: TStringKey; bodyKey: TStringKey; sprite: string };

const CARDS: TCard[] = [
  { titleKey: 'howto.flash.title', bodyKey: 'howto.flash.body', sprite: 'mode-flash' },
  { titleKey: 'howto.dilemma.title', bodyKey: 'howto.dilemma.body', sprite: 'mode-dilemma' },
  { titleKey: 'howto.ultime.title', bodyKey: 'howto.ultime.body', sprite: 'ui-crown' },
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
      <PixelButton variant="ghost" onClick={handleBack}>
        ← {t('common.back')}
      </PixelButton>
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
            <Sprite name={card.sprite} size={48} />
            <h2 className="cb-heading">{t(card.titleKey)}</h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{t(card.bodyKey)}</p>
          </PixelPanel>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ProgressDots total={CARDS.length} current={index} />
      </div>
      <p className="cb-muted" style={{ textAlign: 'center', margin: 0 }}>
        {t('howto.swipe')}
      </p>
    </Screen>
  );
};
