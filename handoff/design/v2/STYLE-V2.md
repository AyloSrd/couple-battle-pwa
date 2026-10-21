# Couple Battle — Visual style v2 ("Paper + Sunburst")

Replaces the retro pixel style entirely. **Game logic, flows, copy and sounds are unchanged — this is a visual layer swap.**
Palette and typefaces come from the Master Brand & Style Guide v1.0; the design system is `tokens.css` + `components.css` in this folder.
`reference.html` / `reference.png` show six screens built only from those two files and the delivered assets — that is the visual target.

## 1. Two modes, one system

- **Paper** (default): a calm pastel gradient — lavender → butter-cream → blush-pink (`--cb-bg-calm`), **never dark**. White cards on a 2 px lip, pressable buttons with a real bottom edge. Used for everything you read, type or tap through. The old faint pink dot texture is gone.
- **Sunburst** (class `cb-burst`): the same pastel stops with white sunburst rays radiating outward (`--cb-bg-burst`), for the big theatrical beats only. It does **not** remap any semantic token — burst screens use the same light Paper cards, shadows and chips as everywhere else, just a different page background.

| Sunburst screens | Paper screens (everything else) |
|---|---|
| V-Countdown (Dilemme and rapid-fire countdown) | Home, HowToPlay, Settings, Legal |
| V-FinalRapidFire (whole finale) | Setup (team pick, names, pass interstitial) |
| V-Scoreboard (between rounds) | ModeSelect, DifficultySelect, ModeGuidelines |
| V-FinalResults | PassPhone, sofa-side gates, SecretAnswers |
| | GuessReveal, Judge, DilemmaQuestion, DilemmaResolve, PauseSheet |

`bg-calm.webp` / `bg-burst.webp` art layers are **not delivered yet**. When they land: copy them to `src/assets/art/` and prepend `url('../assets/art/bg-….webp') center / cover no-repeat` as the top layer of the matching token — see the `TODO(art)` comment above `--cb-bg-calm` / `--cb-bg-burst` in `tokens.css`.

## 2. Typography

- Display: **Bricolage Grotesque** 700/800 — titles, question text, countdown numerals, scores, "+2".
- UI: **Inter** 400–700 — everything else, including buttons, labels and **team names** (correct accents: "Les Écureuils").
- Sentence case for interface copy. Uppercase only for chips/overlines and the one-word countdown cue (POINTEZ ! / RÉPONDEZ !).
- Tabular numerals on scores and timers. Question text ≥ 26 px (readable across a table).

## 3. Palette

Every violet is unchanged from v2. Red/yellow/green were re-tuned to pastels for the "Pastel sunburst" pass, each with a bg/edge pair (the edge is an inset ring, not a WCAG-relevant border — see Contrast below).

| Role | Token(s) | Value |
|---|---|---|
| P2 / "Non" fill | `--cb-p2` / `--cb-p2-edge` / `--cb-p2-text` | `#FFB3C1` / `#F28CA0` / `--cb-eggplant` |
| Win fill | `--cb-win` / `--cb-win-edge` / `--cb-win-grad` | `#FFE7A0` / `#F2C95E` / `linear-gradient(95deg, #FFF3CC, #FFE7A0)` |
| Success (text only) | `--cb-success` / `--cb-success-bg` / `--cb-success-edge` | `#0C5F41` / `#CFF5E3` / `#9EDFC1` |
| Error (text only) | `--cb-error` / `--cb-error-bg` / `--cb-error-edge` | `#9E1F35` / `#FFD6DC` / `#F2A7B3` |
| Points ("+2") | `--cb-points` | `var(--cb-violet)` — a pastel can't pass 3:1 as text, so points stay violet, not a pastel |
| Muted text | `--cb-text-muted` | `#5E4E66` — ≥4.5:1 on every background stop |
| Focus ring | `--cb-focus` | `var(--cb-pink-deep)` = `#C4137F` — ≥3.6:1 on every background stop |
| Sunburst glow | `--cb-glow-light` | `0 0 24px rgba(255,255,255,.9), 0 0 6px rgba(255,255,255,.9)` — soft white halo behind big numerals / GO / points |

**Unchanged violets:** `--cb-violet` (`#611EFA`) and `--cb-violet-edge` (`#3F0DB5`) — used for `--cb-action`/`--cb-action-edge`, `--cb-p1`/`--cb-p1-edge`, the text-field focus border, and every selection ring (team tile, mode/difficulty card `aria-pressed`).

`--cb-gold`, `--cb-orange` and `--cb-coral`/`--cb-coral-edge` stay defined in the brand palette block but no component references them anymore.

## 4. Contrast

WCAG 2.x relative luminance / contrast ratio, computed with the standard sRGB-linearisation formula (`c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`) and `ratio = (L1+0.05)/(L2+0.05)`. All ratios rounded to 2 decimals. Backgrounds tested: burst lavender `#D9C8F7`, butter-cream `#FFF6D9`, burst pink `#F8C6D8`, calm lavender `#E9DDFB`, calm pink `#FBD9E6`, and card white `#FFFFFF`.

### 4.1 Body text (`--cb-text` / eggplant `#300147`) — threshold 4.5:1

| Pair | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF | threshold | result |
|---|---|---|---|---|---|---|---|---|
| Body text `#300147` (eggplant) | 11.10 ✅ | 15.92 ✅ | 11.52 ✅ | 13.27 ✅ | 13.24 ✅ | 17.20 ✅ | 4.5:1 | PASS |

### 4.2 Muted text — threshold 4.5:1

| Pair | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF | threshold | result |
|---|---|---|---|---|---|---|---|---|
| Muted text `#5E4E66` (current) | 4.92 ✅ | 7.05 ✅ | 5.10 ✅ | 5.87 ✅ | 5.86 ✅ | 7.62 ✅ | 4.5:1 | PASS |
| Muted text `#6B5C73` (OLD, comparison) | 3.98 ❌ | 5.71 ✅ | 4.13 ❌ | 4.76 ✅ | 4.75 ✅ | 6.17 ✅ | 4.5:1 | FAIL |

### 4.3 Violet as text (`--cb-violet` `#611EFA`, e.g. countdown numeral ≥24px, points)

| Pair | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF | threshold | result |
|---|---|---|---|---|---|---|---|---|
| Violet `#611EFA` (large text) | 4.41 ✅ | 6.32 ✅ | 4.57 ✅ | 5.27 ✅ | 5.26 ✅ | 6.83 ✅ | 3:1 | PASS |
| Violet `#611EFA` (any-size text, for comparison) | 4.41 ❌ | 6.32 ✅ | 4.57 ✅ | 5.27 ✅ | 5.26 ✅ | 6.83 ✅ | 4.5:1 | FAIL |

### 4.4 Pink-deep GO text / focus ring — threshold 3:1

| Pair | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF | threshold | result |
|---|---|---|---|---|---|---|---|---|
| Pink-deep `#C4137F` as GO text (large, ≥24px bold) | 3.62 ✅ | 5.19 ✅ | 3.75 ✅ | 4.32 ✅ | 4.32 ✅ | 5.60 ✅ | 3:1 | PASS |
| Pink-deep `#C4137F` as focus ring (non-text) | 3.62 ✅ | 5.19 ✅ | 3.75 ✅ | 4.32 ✅ | 4.32 ✅ | 5.60 ✅ | 3:1 | PASS |
| `#F21CA6` OLD focus (`--cb-pink`, comparison) | 2.47 ❌ | 3.54 ✅ | 2.56 ❌ | 2.95 ❌ | 2.94 ❌ | 3.82 ✅ | 3:1 | FAIL |

### 4.5 Buttons — text on fill — threshold 4.5:1

| Pair | Fill | Ratio | Threshold | Result |
|---|---|---|---|---|
| Eggplant text `#300147` on Success button (`--cb-success-bg`) | `#CFF5E3` | 14.60 ✅ | 4.5:1 | PASS |
| Eggplant text `#300147` on Win-grad stop 1 (`--cb-win-grad` start) | `#FFF3CC` | 15.52 ✅ | 4.5:1 | PASS |
| Eggplant text `#300147` on Win-grad stop 2 (`--cb-win-grad` end / `--cb-win`) | `#FFE7A0` | 14.08 ✅ | 4.5:1 | PASS |
| Eggplant text `#300147` on Error button (`--cb-error-bg`) | `#FFD6DC` | 13.03 ✅ | 4.5:1 | PASS |
| Eggplant text `#300147` on P2 button (`--cb-p2`) | `#FFB3C1` | 10.21 ✅ | 4.5:1 | PASS |
| White text `#FFFFFF` on Violet primary button `#611EFA` | `#611EFA` | 6.83 ✅ | 4.5:1 | PASS |

### 4.6 Non-text edges / rings — threshold 3:1 (reported even when failing, by design)

The pastel fills (success / win / error / P2) carry an inset 1.5 px edge ring purely so the pill shape reads against the pastel page background — it is a decorative separation line, not a WCAG text or UI-component boundary that the brief requires to hit 3:1. The two rings the brief *does* require at 3:1 are the focus ring (§4.4) and the progress-dot/fill colour (§4.9) — both pass.

| Edge | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF | vs own fill | threshold | result |
|---|---|---|---|---|---|---|---|---|---|
| Success edge `#9EDFC1` | 1.02 ❌ | 1.41 ❌ | 1.02 ❌ | 1.18 ❌ | 1.17 ❌ | 1.52 ❌ | 1.29 ❌ (own fill `#CFF5E3`) | 3:1 | FAIL (by design, see above) |
| Win edge `#F2C95E` | 1.02 ❌ | 1.46 ❌ | 1.06 ❌ | 1.22 ❌ | 1.22 ❌ | 1.58 ❌ | 1.29 ❌ (own fill `#FFE7A0`) | 3:1 | FAIL (by design, see above) |
| Error edge `#F2A7B3` | 1.24 ❌ | 1.77 ❌ | 1.28 ❌ | 1.48 ❌ | 1.48 ❌ | 1.92 ❌ | 1.45 ❌ (own fill `#FFD6DC`) | 3:1 | FAIL (by design, see above) |
| P2 edge `#F28CA0` | 1.50 ❌ | 2.15 ❌ | 1.56 ❌ | 1.79 ❌ | 1.79 ❌ | 2.32 ❌ | 1.38 ❌ (own fill `#FFB3C1`) | 3:1 | FAIL (by design, see above) |

### 4.7 Text-only semantic colours — threshold 4.5:1

| Pair | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF | threshold | result |
|---|---|---|---|---|---|---|---|---|
| Success text `#0C5F41` (current) | 4.97 ✅ | 7.12 ✅ | 5.15 ✅ | 5.94 ✅ | 5.93 ✅ | 7.70 ✅ | 4.5:1 | PASS |
| Success text `#0F6B4A` (OLD, comparison — was 4.21 on the burst lavender) | 4.21 ❌ | 6.03 ✅ | 4.36 ❌ | 5.03 ✅ | 5.02 ✅ | 6.52 ✅ | 4.5:1 | FAIL |
| Error text `#9E1F35` | 5.02 ✅ | 7.20 ✅ | 5.21 ✅ | 6.00 ✅ | 5.99 ✅ | 7.77 ✅ | 4.5:1 | PASS |

Error text `#9E1F35` on white `#FFFFFF` (called out specifically): **7.77** ✅ PASS @ 4.5:1 (same value as the "on #FFFFFF" column above).

### 4.8 Chip — pink-deep text on chip background — threshold 4.5:1

| Pair | Background | Ratio | Threshold | Result |
|---|---|---|---|---|
| Pink-deep text `#C4137F` on chip `#FDE4F3` | `#FDE4F3` | 4.69 ✅ | 4.5:1 | PASS |

### 4.9 Progress fill (`--cb-action` = violet `#611EFA`) — threshold 3:1

| Pair | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF | threshold | result |
|---|---|---|---|---|---|---|---|---|
| Progress fill `#611EFA` | 4.41 ✅ | 6.32 ✅ | 4.57 ✅ | 5.27 ✅ | 5.26 ✅ | 6.83 ✅ | 3:1 | PASS |

### 4.10 Pastel fills vs backgrounds (informational — no pass/fail target)

| Fill | on #D9C8F7 | on #FFF6D9 | on #F8C6D8 | on #E9DDFB | on #FBD9E6 | on #FFFFFF |
|---|---|---|---|---|---|---|
| Success fill `#CFF5E3` | 1.31 | 1.09 | 1.27 | 1.10 | 1.10 | 1.18 |
| Win fill `#FFE7A0` | 1.27 | 1.13 | 1.22 | 1.06 | 1.06 | 1.22 |
| Error fill `#FFD6DC` | 1.17 | 1.22 | 1.13 | 1.02 | 1.02 | 1.32 |
| P2 fill `#FFB3C1` | 1.09 | 1.56 | 1.13 | 1.30 | 1.30 | 1.68 |

### Failures (final palette — comparison-only rows for retired values kept for context)

| Pair | Against | Ratio | Threshold | Note |
|---|---|---|---|---|
| Muted text `#6B5C73` (OLD, retired) | `#D9C8F7` | 3.98 | 4.5:1 | Retired — replaced by `#5E4E66` (current), which passes everywhere. |
| Muted text `#6B5C73` (OLD, retired) | `#F8C6D8` | 4.13 | 4.5:1 | Retired — replaced by `#5E4E66` (current), which passes everywhere. |
| Violet `#611EFA` (any-size text, 4.5:1, comparison) | `#D9C8F7` | 4.41 | 4.5:1 | Brand violet — not recoloured; violet text is only used ≥24px bold, where 3:1 applies and it passes (§4.3). |
| OLD focus `#F21CA6` (retired) | `#D9C8F7` / `#F8C6D8` / `#E9DDFB` / `#FBD9E6` | 2.47 / 2.56 / 2.95 / 2.94 | 3:1 | Retired — replaced by pink-deep `#C4137F` (current focus ring), which passes everywhere (§4.4). |
| Success edge `#9EDFC1`, Win edge `#F2C95E`, Error edge `#F2A7B3`, P2 edge `#F28CA0` (non-text rings) | all six backgrounds | 1.02 – 2.32 | 3:1 | By design — decorative inset ring, not the WCAG-relevant boundary (see §4.6). |

Success text is the one row that changed outcome for the shipped palette: darkened from `#0F6B4A` (FAIL, 4.21:1 on the burst lavender) to `#0C5F41` (PASS, ≥4.97:1 everywhere) — see §4.7.

## 5. Assets (this folder)

| Path | Use |
|---|---|
| `web/logo-480.webp`, `web/logo-960.webp` | approved logo (extracted from the guide, never redrawn) — Home, Legal |
| `web/mode-{flash,dilemma,ultime}-{128,256}.webp` | mode cards (256), chips and headers (128) |
| `web/team-otters-idle-{512,768}.webp` | otters team art — team tile (512), hero/winner/finale (768) |
| `source/` | full-size PNG masters — not shipped in the bundle |
| `pwa-icons/` | **temporary** manifest icons (logo on violet→pink); replace when the app-icon master is approved |
| `fonts/` | self-hosted woff2 + OFL licences |

**Only the otters have character art so far.** The other 11 teams render the placeholder tile (tinted square + team initial, see `.cb-team-placeholder`). Future drops follow the same naming (`team-{id}-idle-{512,768}.webp`), so resolve team art by id with a fallback, and adding a couple is a file drop with no code change.

Not produced yet (keep text-only for now, no icons): difficulty cards, theme toggles, reaction poses, solo poses. Do not reuse the old pixel sprites for them.

## 6. Retired

Press Start 2P and IBM Plex Mono · all pixel sprites in `handoff/design/sprites/` (flags included — use text "FR / EN" chips) · the old `handoff/design/tokens.css` · the old `handoff/design/pwa-icons/`. The Spotlight stage remap and its dark tokens (`--cb-bg-stage`, `#150024`/`#22013A`, `--cb-glow-pink`/`--cb-glow-gold`) are retired too — `.cb-stage` / `[data-stage]` no longer exist, and nothing remaps `--cb-surface`, `--cb-text`, `--cb-success` etc. for a dark mode. The Ninou Games studio splash (and its penguin PNG) is retired as well: the app boots straight into Home.

## 7. Rules

- Components reference `--cb-*` tokens only; no raw hex in component code.
- One major gradient per screen; shadows are coloured, never heavy black.
- Primary button 56 px, secondary 52 px, answer buttons 66 px, touch targets ≥ 48 px, radii 12/16/24/32.
- Motion: tap 100 ms, screen 260 ms, countdown numeral 700 ms, reveal 550 ms overshoot, score count once (no slot-machine loop). `prefers-reduced-motion` removes scale/overshoot, keeps numerals.
- Visible focus ring on every control; state never communicated by colour alone (match/miss verdicts always have words).
- Portrait stays the orientation for this PWA (the guide's "landscape" note is about the future native game).
