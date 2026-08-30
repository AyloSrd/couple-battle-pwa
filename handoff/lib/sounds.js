/**
 * Couple Battle — sound engine (Web Audio synthesis, zero audio files).
 * Ids match couple-battle-copy-assets.md. ES module, framework-agnostic.
 *
 * Usage:
 *   import { sound } from './sounds.js'
 *   document.addEventListener('pointerdown', () => sound.unlock(), { once: true }) // iOS
 *   sound.play('sfx.tap')
 *   sound.play('sfx.countdown.tick', { step: 3 })
 *   sound.music('mus.menu') / sound.music(null)
 *   sound.setEnabled(false)
 */

const S = 0.0001; // exp ramp floor

class Engine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.musicTimer = null;
    this.musicGain = null;
    this.currentMusic = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.music(null);
    if (this.master) this.master.gain.value = on ? 0.55 : 0;
  }

  /** Duck music volume (e.g. pause sheet open) */
  duck(on) {
    if (this.musicGain) this.musicGain.gain.value = on ? 0.09 : 0.3;
  }

  // ---- primitives -------------------------------------------------------
  tone({ freq = 440, type = 'square', t = 0, dur = 0.08, vol = 0.5, slideTo = null, out = null }) {
    const c = this.ctx, now = c.currentTime + t;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(S, now + dur);
    o.connect(g).connect(out || this.master);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  noise({ t = 0, dur = 0.1, vol = 0.4, hp = 800, lpFrom = null, lpTo = null }) {
    const c = this.ctx, now = c.currentTime + t;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    if (lpFrom) {
      f.type = 'lowpass';
      f.frequency.setValueAtTime(lpFrom, now);
      f.frequency.exponentialRampToValueAtTime(lpTo || lpFrom, now + dur);
    } else {
      f.type = 'highpass';
      f.frequency.value = hp;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(S, now + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(now);
  }

  chord(freqs, { t = 0, dur = 0.25, type = 'square', vol = 0.25 } = {}) {
    freqs.forEach(f => this.tone({ freq: f, type, t, dur, vol }));
  }

  // ---- SFX --------------------------------------------------------------
  play(id, opt = {}) {
    if (!this.enabled) return;
    this.unlock();
    const fx = {
      'sfx.tap':       () => this.tone({ freq: 880, dur: 0.05, vol: 0.3 }),
      'sfx.back':      () => this.tone({ freq: 440, dur: 0.06, vol: 0.3 }),
      'sfx.error':     () => { this.tone({ freq: 330, dur: 0.09 }); this.tone({ freq: 220, t: 0.1, dur: 0.14 }); },
      'sfx.whoosh':    () => this.noise({ dur: 0.12, vol: 0.25, lpFrom: 400, lpTo: 4000 }),
      'sfx.select':    () => { this.tone({ freq: 660, dur: 0.06 }); this.tone({ freq: 990, t: 0.07, dur: 0.09 }); },
      'sfx.toggle.on': () => { this.tone({ freq: 523, dur: 0.05 }); this.tone({ freq: 784, t: 0.06, dur: 0.07 }); },
      'sfx.toggle.off':() => { this.tone({ freq: 784, dur: 0.05 }); this.tone({ freq: 523, t: 0.06, dur: 0.07 }); },
      'sfx.lock':      () => { this.tone({ freq: 1567, dur: 0.03, vol: 0.35 }); this.noise({ t: 0.02, dur: 0.04, vol: 0.3, hp: 3000 }); },
      'sfx.pass':      () => { this.noise({ dur: 0.09, vol: 0.22, lpFrom: 500, lpTo: 3000 }); this.noise({ t: 0.12, dur: 0.09, vol: 0.22, lpFrom: 3000, lpTo: 500 }); },
      'sfx.reveal':    () => { this.tone({ freq: 200, dur: 0.22, slideTo: 1200, vol: 0.3 }); this.tone({ freq: 1568, t: 0.24, dur: 0.1, type: 'triangle', vol: 0.4 }); },
      'sfx.point.exact': () => { [523, 659, 784].forEach((f, i) => this.tone({ freq: f, t: i * 0.07, dur: 0.09 })); },
      'sfx.point.close': () => { [523, 659].forEach((f, i) => this.tone({ freq: f, t: i * 0.08, dur: 0.1 })); },
      'sfx.point.miss':  () => { this.tone({ freq: 311, dur: 0.14 }); this.tone({ freq: 233, t: 0.15, dur: 0.22 }); },
      'sfx.countdown.tick': () => {
        const step = opt.step ?? 3; // 3, 2, 1
        const f = { 3: 660, 2: 784, 1: 988 }[step] || 660;
        this.tone({ freq: f, type: 'triangle', dur: 0.07, vol: 0.6 });
      },
      'sfx.countdown.go': () => {
        this.chord([523, 659, 784, 1046], { dur: 0.35, vol: 0.22 });
        this.noise({ dur: 0.2, vol: 0.3, hp: 1500 });
      },
      'sfx.score.tally': () => this.tone({ freq: 1046 + Math.random() * 200, type: 'triangle', dur: 0.04, vol: 0.35 }),
      'sfx.synchro':   () => { [659, 784, 988, 1318].forEach((f, i) => this.tone({ freq: f, t: i * 0.06, dur: 0.09, type: 'triangle', vol: 0.45 })); },
      'sfx.mismatch':  () => { [415, 349, 277].forEach((f, i) => this.tone({ freq: f, t: i * 0.14, dur: 0.18 })); },
      'sfx.confetti':  () => { for (let i = 0; i < 6; i++) this.noise({ t: i * 0.05 + Math.random() * 0.02, dur: 0.05, vol: 0.2, hp: 2000 + Math.random() * 3000 }); },
      'sfx.splash.clash': () => {
        this.noise({ dur: 0.15, vol: 0.4, hp: 1000 });
        [523, 659, 1046].forEach((f, i) => this.tone({ freq: f, t: 0.1 + i * 0.08, dur: 0.12 }));
      },
      'mus.birthday':  () => {
        // Happy Birthday, chiptune one-shot (~9 s). Square lead + triangle an octave below.
        const bpm = 180, beat = 60 / bpm;
        const G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99;
        const seq = [
          [G4, .75], [G4, .25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
          [G4, .75], [G4, .25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
          [G4, .75], [G4, .25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 2],
          [F5, .75], [F5, .25], [E5, 1], [C5, 1], [D5, 1], [C5, 3],
        ];
        let b = 0;
        for (const [f, d] of seq) {
          this.tone({ freq: f, t: b * beat, dur: d * beat * 0.9, vol: 0.32 });
          this.tone({ freq: f / 2, t: b * beat, dur: d * beat * 0.9, type: 'triangle', vol: 0.18 });
          b += d;
        }
        for (let i = 0; i < 5; i++) this.noise({ t: b * beat + i * 0.06, dur: 0.05, vol: 0.18, hp: 2500 });
      },
      'mus.fanfare':   () => {
        const seq = [[523, 0, .12], [523, .14, .12], [523, .28, .12], [659, .42, .3], [523, .76, .12], [659, .9, .5]];
        seq.forEach(([f, t, d]) => { this.tone({ freq: f, t, dur: d, vol: 0.35 }); this.tone({ freq: f / 2, t, dur: d, type: 'triangle', vol: 0.3 }); });
        this.play('sfx.confetti');
      },
    };
    (fx[id] || (() => console.warn('unknown sound', id)))();
  }

  // ---- music loops ------------------------------------------------------
  music(id) {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    this.currentMusic = id;
    // hard-stop whatever is already scheduled: kill the whole music bus
    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(0);
      this.musicGain.gain.value = 0;
      this.musicGain.disconnect();
      this.musicGain = null;
    }
    if (!id || !this.enabled) return;
    this.unlock();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.3;
    this.musicGain.connect(this.master);
    const loops = {
      // [bpm, [beat, freq, dur(beats), type] ...] — one bar loop patterns
      'mus.menu': {
        bpm: 104, bars: 4,
        notes: [
          // lead (square) — cheerful I-V-vi-IV noodle
          [0, 523, .5, 'square'], [1, 659, .5, 'square'], [2, 784, .5, 'square'], [3, 659, .5, 'square'],
          [4, 587, .5, 'square'], [5, 784, .5, 'square'], [6, 988, 1, 'square'],
          [8, 440, .5, 'square'], [9, 523, .5, 'square'], [10, 659, .5, 'square'], [11, 523, .5, 'square'],
          [12, 587, .5, 'square'], [13, 698, .5, 'square'], [14, 587, 1.5, 'square'],
          // bass (triangle)
          [0, 131, 1, 'triangle'], [2, 131, 1, 'triangle'], [4, 196, 1, 'triangle'], [6, 196, 1, 'triangle'],
          [8, 110, 1, 'triangle'], [10, 110, 1, 'triangle'], [12, 147, 1, 'triangle'], [14, 147, 1, 'triangle'],
        ],
      },
      'mus.final': {
        bpm: 128, bars: 2,
        notes: [
          [0, 220, .5, 'square'], [1, 262, .5, 'square'], [2, 330, .5, 'square'], [3, 262, .5, 'square'],
          [4, 220, .5, 'square'], [5, 262, .5, 'square'], [6, 349, .5, 'square'], [7, 330, .5, 'square'],
          [0, 110, 2, 'triangle'], [2, 110, 2, 'triangle'], [4, 87, 2, 'triangle'], [6, 98, 2, 'triangle'],
        ],
      },
    };
    const L = loops[id];
    if (!L) return;
    const beat = 60 / L.bpm / 2; // 8th notes as grid
    const barDur = L.bars * 8 * beat;
    const bus = this.musicGain;
    // drift-free scheduling: anchor every bar to AudioContext time, look ahead
    let nextBar = this.ctx.currentTime + 0.05;
    const scheduleBar = (at) => {
      L.notes.forEach(([b, f, d, type]) => {
        this.tone({ freq: f, t: (at - this.ctx.currentTime) + b * beat, dur: d * beat * 0.9, type, vol: type === 'square' ? 0.16 : 0.22, out: bus });
      });
    };
    scheduleBar(nextBar);
    nextBar += barDur;
    this.musicTimer = setInterval(() => {
      if (this.currentMusic !== id || bus !== this.musicGain) return;
      // schedule the next bar only when it's close (0.6s lookahead)
      if (nextBar - this.ctx.currentTime < 0.6) {
        scheduleBar(nextBar);
        nextBar += barDur;
      }
    }, 120);
  }
}

export const sound = new Engine();
