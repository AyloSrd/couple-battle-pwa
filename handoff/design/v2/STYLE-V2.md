# Couple Battle — Visual style v2 ("Paper + Spotlight")

Replaces the retro pixel style entirely. **Game logic, flows, copy and sounds are unchanged — this is a visual layer swap.**
Palette and typefaces come from the Master Brand & Style Guide v1.0; the design system is `tokens.css` + `components.css` in this folder.
`reference.html` / `reference.png` show six screens built only from those two files and the delivered assets — that is the visual target.

## 1. Two modes, one system

- **Paper** (default, light): warm canvas `#FFF8F7` with a faint pink dot texture, white cards on a 2 px lip, pressable buttons with a real bottom edge. Used for everything you read, type or tap through.
- **Spotlight stage** (dark, class `cb-stage`): deep eggplant with a violet aura and pink glow. It re-maps the semantic tokens, so the same components render correctly on it. Used **only** for the theatrical beats:

| Stage screens | Paper screens (everything else) |
|---|---|
| V-Countdown (Dilemme and rapid-fire countdown) | Home, HowToPlay, Settings, Legal |
| V-FinalRapidFire (whole finale) | Setup (team pick, names, pass interstitial) |
| V-Scoreboard (between rounds) | ModeSelect, DifficultySelect, ModeGuidelines |
| V-FinalResults | PassPhone, sofa-side gates, SecretAnswers |
| Phase 1.b studio splash + birthday card | GuessReveal, Judge, DilemmaQuestion, DilemmaResolve, PauseSheet |

On stage the question card stays light (a lit object) and the primary CTA turns gold.

## 2. Typography

- Display: **Bricolage Grotesque** 700/800 — titles, question text, countdown numerals, scores, "+2".
- UI: **Inter** 400–700 — everything else, including buttons, labels and **team names** (correct accents: "Les Écureuils").
- Sentence case for interface copy. Uppercase only for chips/overlines and the one-word countdown cue (POINTEZ ! / RÉPONDEZ !).
- Tabular numerals on scores and timers. Question text ≥ 26 px (readable across a table).

## 3. Assets (this folder)

| Path | Use |
|---|---|
| `web/logo-480.webp`, `web/logo-960.webp` | approved logo (extracted from the guide, never redrawn) — Home, Phase 1.b, Legal |
| `web/mode-{flash,dilemma,ultime}-{128,256}.webp` | mode cards (256), chips and headers (128) |
| `web/team-otters-idle-{512,768}.webp` | otters team art — team tile (512), hero/winner/finale (768) |
| `source/` | full-size PNG masters — not shipped in the bundle |
| `pwa-icons/` | **temporary** manifest icons (logo on violet→pink); replace when the app-icon master is approved |
| `fonts/` | self-hosted woff2 + OFL licences |

**Only the otters have character art so far.** The other 11 teams render the placeholder tile (tinted square + team initial, see `.cb-team-placeholder`). Future drops follow the same naming (`team-{id}-idle-{512,768}.webp`), so resolve team art by id with a fallback, and adding a couple is a file drop with no code change.

Not produced yet (keep text-only for now, no icons): difficulty cards, theme toggles, reaction poses, solo poses. Do not reuse the old pixel sprites for them.

## 4. Retired

Press Start 2P and IBM Plex Mono · all pixel sprites in `handoff/design/sprites/` (flags included — use text "FR / EN" chips) · the old `handoff/design/tokens.css` · the old `handoff/design/pwa-icons/`. The Ninou Games penguin splash stays as-is (it is the studio's own identity) and sits on the Spotlight stage.

## 5. Rules

- Components reference `--cb-*` tokens only; no raw hex in component code.
- One major gradient per screen; shadows are coloured, never heavy black.
- Primary button 56 px, secondary 52 px, answer buttons 66 px, touch targets ≥ 48 px, radii 12/16/24/32.
- Motion: tap 100 ms, screen 260 ms, countdown numeral 700 ms, reveal 550 ms overshoot, score count once (no slot-machine loop). `prefers-reduced-motion` removes scale/overshoot, keeps numerals.
- Visible focus ring on every control; state never communicated by colour alone (match/miss verdicts always have words).
- Portrait stays the orientation for this PWA (the guide's "landscape" note is about the future native game).
