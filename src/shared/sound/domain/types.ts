/** Ids playable via `play()` (all sfx.* plus the one-shot mus.fanfare). */
export type TSoundId =
  | 'sfx.tap'
  | 'sfx.back'
  | 'sfx.error'
  | 'sfx.whoosh'
  | 'sfx.select'
  | 'sfx.toggle.on'
  | 'sfx.toggle.off'
  | 'sfx.lock'
  | 'sfx.pass'
  | 'sfx.reveal'
  | 'sfx.point.exact'
  | 'sfx.point.close'
  | 'sfx.point.miss'
  | 'sfx.countdown.tick'
  | 'sfx.countdown.go'
  | 'sfx.score.tally'
  | 'sfx.synchro'
  | 'sfx.mismatch'
  | 'sfx.confetti'
  | 'sfx.splash.clash'
  | 'mus.fanfare';

/** Looping music, driven by `music()`. */
export type TMusicId = 'mus.menu' | 'mus.final';

/** Per-play options. `step` pitches the countdown tick (3 → 2 → 1). */
export type TPlayOpts = { step?: 3 | 2 | 1 };
