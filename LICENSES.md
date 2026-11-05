# Assets and licences

Couple Battle is a personal project. This file records where each shipped asset comes from.

## Music

Original, generated entirely by code in `music-lab/` (no samples, no downloaded audio, no
third-party melodies). Direction "Bounce House" (G major): `public/audio/menu.m4a` (125 BPM,
46.1 s loop), `public/audio/final.m4a` (130 BPM, 29.5 s loop) and `public/audio/round.m4a`
(3.6 s one-shot stinger). Mastered to -16 LUFS, AAC 160 kbps, seamless loops.

## Sound effects

Synthesized at runtime with the Web Audio API (oscillators and noise), ported to TypeScript from
`handoff/lib/sounds.js` into `src/shared/sound/api/webAudio.ts`. No audio samples are shipped
for SFX.

## Fonts (`public/fonts/`, self-hosted, SIL Open Font License 1.1)

- Bricolage Grotesque (600, 700, 800; latin) - licence in `public/fonts/OFL-BricolageGrotesque.txt`
  (Copyright 2022 The Bricolage Grotesque Project Authors).
- Inter (400, 500, 600, 700; latin) - licence in `public/fonts/OFL-Inter.txt`
  (Copyright 2016 The Inter Project Authors).

Note: `BRIEF.md` mentions Press Start 2P (OFL) and Ubuntu Mono (UFL) from the earlier pixel look.
They are no longer shipped; the refont v3 uses the two families above.

## Art, sprites, splash and icons

Pixel sprites (`handoff/design/sprites/`), the refont v3 art (`handoff/design/v3-refont/`: key art,
logo, team art), the PWA icons (`public/pwa-icons/`) and the splash poster and clip
(`public/splash/`) come from the design hand-off in `handoff/design`. The repository does not say
who created them or under what licence: provenance to confirm.
