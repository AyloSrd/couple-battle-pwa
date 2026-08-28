# Couple Battle — Build Brief (START HERE)

You are building **Couple Battle**: a mobile-first, offline-capable **PWA party game** where 1–4
couples pass ONE phone around and compete to prove who knows their partner best. French is the
primary language, English secondary. It ships as a static site on **GitHub Pages**. Frontend only —
no server, no accounts, no analytics. It is a gift project: quality bar is "feels like a real game",
not "enterprise product".

## Read order (before writing any code)

1. **This file** — scope, phases, working agreement.
2. **`ARCHITECTURE.md`** — the architecture contract. It is law. Its preamble pins the stack
   (React 19, TanStack Router with hash history, TanStack Query, Zod, vite-plugin-pwa, idb,
   typed-hook i18n) and maps the generic doc onto this game.
3. **`handoff/docs/views-spec.md`** — the master functional spec: every view with wireframe, strings,
   assets, interactions, state, edge cases; plus routing model, deck sizes, scoring, IndexedDB
   schema, question-drawing algorithm, PWA requirements.
4. **`handoff/docs/copy-assets.md`** — full FR/EN copy tables (source of `src/data/strings.*.ts`) and the
   sprite/SFX/animation manifest with ids.

## What is already made (do NOT recreate, do NOT edit sources)

| Input | Use |
|---|---|
| `handoff/data/questions.fr.json` / `questions.en.json` | 1,035 questions each: `{id, theme, difficulty, type, text}`. Same ids across languages. Copy into `src/data/`, Zod-parse in the questions adapter |
| `handoff/data/strings.fr.ts` / `strings.en.ts` | All 185 UI strings, `as const`, `{placeholder}` interpolation. Copy into `src/data/` |
| `handoff/design/tokens.css` | Design tokens — import globally, style everything through the `--cb-*` custom properties |
| `handoff/design/sprites/*.svg` | 63 pixel sprites (1 SVG unit = 1 px, crisp). Serve from `public/` or import as assets; always render crisp (`image-rendering: pixelated` for raster fallbacks). Naming: manifest ids with dots→dashes (`spr.ui.heart` → `ui-heart.svg`) |
| `handoff/design/pwa-icons/` | Manifest icons (512/192), apple-touch-icon, favicon |
| `handoff/lib/sounds.js` | The finished sound engine. Port to TS as the sound adapter behind a `TSoundApi` port — keep the synthesis code byte-for-byte, it is tuned and approved |
| `handoff/docs/wireframes/*.png` | Per-view layout reference (mid-fi; tokens.css defines the final look) |
| Fonts | Download **Press Start 2P** and **IBM Plex Mono** (latin, woff2) from Google Fonts and self-host in `public/fonts/` with the OFL license file — no runtime Google Fonts requests (offline requirement) |

## Phases

Work strictly in order. **At the end of each phase: run the gate checklist, commit, then STOP and
wait for Luca's explicit OK before starting the next phase.** Luca tests on a real phone
(`vite preview --host` on LAN, or the Pages deploy).

### Phase 0 — Repo & toolchain
Vite + React 19 + TS strict + Vitest + ESLint (with `eslint-plugin-boundaries` or
`import/no-restricted-paths` encoding the import-boundary table from ARCHITECTURE.md) +
vite-plugin-pwa + GitHub Actions workflow deploying `dist/` to Pages. Copy the inputs above into
place. `base` configured for project pages; router on `createHashHistory()`.
**Gate:** `npm run typecheck && npm run lint && npm run test && npm run build` all green; empty
app deploys to Pages; boundary lint fails on a deliberate forbidden import (prove it, then remove
the probe).

### Phase 1 — Scaffolding + walking skeleton
The horizontal layer, ARCHITECTURE.md shapes: `app/container.ts` (questions json adapter, save idb
adapter, sound adapter, wake-lock adapter — plus memory/no-op twins), `shared/questions`,
`shared/save`, `shared/i18n`, `shared/Chrome` (PixelButton, PixelPanel, Sprite, ProgressDots),
routes for every real screen, `views/Settings`, `views/Legal`, `views/HowToPlay` fully done (they
are small), and a **walking skeleton**: Home → Setup → Mode → Difficulty → `#/play` running a FAKE
one-question game through the real machine shell → FinalResults. No real mode logic yet.
**Gate:** skeleton path playable on a phone; language switch flips every visible string instantly;
sound toggle works (tap blip); settings survive a reload; `createContainer('memory')` boots the
app in tests; all checks green.

### Phase 2 — Vertical slice: DILEMMA
Smallest real mode, proves the whole game loop. Machine states + views per spec §5
(V-DilemmaQuestion, V-Countdown with the 3-2-1 ticks/haptics on the ink-dark screen,
V-DilemmaResolve with per-couple self-confirm), deck drawing for `who_of_two`, scoring,
V-Scoreboard after 5 questions, V-FinalResults with crown/fanfare, seen-ids commit on completion,
snapshot resume mid-game, solo variant (records in `soloBest`).
**Gate — acceptance, on a phone:** a real 2-couple Dilemma game start-to-finish with sounds;
kill the tab mid-game → reopen → resume works; play twice → no repeated questions; solo game
tracks a best score; reducer fully unit-tested (`machine.test.ts` covers every transition).

### Phase 3 — Vertical slice: FLASH
Heaviest slice: V-PassPhone (both variants), V-SecretAnswers (input by question type, lock,
no-back), V-GuessReveal (card flip), V-Judge (one tap for the table) + auto-judged
`this_or_that`/`yes_no`, 2 rounds with role swap, scoreboard between rounds.
**Gate:** full 2-couple Flash game on a phone; a locked answer is unreachable afterwards (no
back path, survives refresh via snapshot); reveal moment feels right (flip + riser sound);
reducer transitions unit-tested.

### Phase 4 — Vertical slice: ULTIME
Composition: Flash rounds (2 q/partner) → Dilemma round (5 q) → V-FinalRapidFire (per-team,
spotlight, `mus.final`, 💖/💀 judging), scoreboards between rounds, crown finale.
**Gate:** full Ultime game; the composition reuses Phase 2/3 machine parts (no copy-paste logic —
if composition is painful, flag it instead of duplicating).

### Phase 5 — PWA & polish
Offline hard-check (airplane mode after first load → full game), install flows (Android prompt,
iOS hint), splash/install icons, wake lock verified on iOS+Android Safari/Chrome, `mus.menu` on
Home, P2 sounds and charm animations (`anim.peek`, confetti), reduced-motion pass, Lighthouse PWA
+ a11y ≥ 90, final Pages deploy.
**Gate:** Luca & Morgane play all three modes at a real dinner table from the installed icon. 🎉

## Working agreement

- **Gates are hard stops.** Finish a phase, run its checks, commit, report what changed and what
  you verified — then wait for Luca.
- Luca will also open the code: keep commits small and messages plain; when he asks for a change,
  it lands within the architecture (never a quick hack "outside" it).
- Never edit generated inputs in place (`questions.*.json`, `strings.*.ts`, sprites, `sounds.js`
  synthesis) — content and asset changes are made upstream by the design side and re-delivered.
- Every domain rule and machine transition gets a co-located test, per ARCHITECTURE.md.
- If the spec and reality conflict (an API changed, a rule is ambiguous), say so and propose —
  do not silently improvise.
- Definition of done for any UI work: works one-handed on a 360-px-wide phone, in FR and EN,
  with sound on and off.
