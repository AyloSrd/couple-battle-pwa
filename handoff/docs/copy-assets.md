# Couple Battle — Copy & Asset Manifest (v0.1)

> Per-view UI labels in **FR (primary)** and **EN**, plus the sprites, animations and sounds each view needs.
> Companion to `couple-battle-views.md` (v0.2). These tables are the source of truth to generate `fr.json` / `en.json`.

## 0. Conventions

- **Keys** are dot-namespaced (`home.play`) and become the i18n string ids in the React app.
- **Placeholders:** `{name}` player first name · `{team}` team name (localized, e.g. "Les Loutres") · `{n}`/`{total}` counters · `{points}` score.
- **FR tone:** tutoiement, oral, punchy. Party-game French, not corporate French. Emoji allowed in copy where shown.
- **EN tone:** same energy, casual.
- **Sprites** are pixel art, drawn on fixed grids (16×16, 32×32, 48×48), exported as SVG (pixel-rect groups) or PNG scaled with `image-rendering: pixelated`. Ids are `spr.*`.
- **Sounds** are ALL synthesized at runtime with Web Audio (no audio files at MVP). Ids are `sfx.*` / `mus.*`, each with a synthesis note for implementation.
- **Animations** are CSS/JS on sprites, ids `anim.*`.

---

## 1. Global / transverse

### Strings

| Key | FR | EN |
|---|---|---|
| `app.name` | Couple Battle | Couple Battle |
| `app.tagline` | Qui de vous deux connaît mieux l'autre ? | Who knows who best? |
| `common.next` | Suivant | Next |
| `common.back` | Retour | Back |
| `common.skip` | Passer | Skip |
| `common.confirm` | Valider | Confirm |
| `common.cancel` | Annuler | Cancel |
| `common.continue` | Continuer | Continue |
| `common.start` | C'est parti ! | Let's go! |
| `common.yes` | Oui | Yes |
| `common.no` | Non | No |
| `common.close` | Fermer | Close |
| `common.round` | Manche {n}/{total} | Round {n}/{total} |
| `common.question` | Question {n}/{total} | Question {n}/{total} |
| `common.points.plus` | +{points} pt(s) | +{points} pt(s) |
| `common.resume.title` | Partie en cours trouvée ! | Game in progress found! |
| `common.resume.body` | Vous étiez en pleine bataille. On reprend ? | You were mid-battle. Pick up where you left off? |
| `common.resume.yes` | Reprendre la partie | Resume game |
| `common.resume.no` | Nouvelle partie | Start fresh |
| `error.deckEmpty` | Plus de questions inédites dans ces thèmes ! On repart sur tout le paquet ? | No unseen questions left in these themes! Reshuffle the whole deck? |
| `error.generic` | Oups, petit bug. On respire et on réessaie. | Oops, tiny bug. Breathe and try again. |

### Global sprites

| Id | Grid | Description |
|---|---|---|
| `spr.logo` | 96×32 | Pixel wordmark "COUPLE BATTLE" — two hearts clashing like fighters, tiny VS spark between them |
| `spr.logo.icon` | 32×32 | Icon-only version (the two clashing hearts) → also source of PWA icons (192/512 maskable) & favicon |
| `spr.avatar.penguins` | 32×32 | Team Manchots — two penguins side by side, one with a tiny bow |
| `spr.avatar.otters` | 32×32 | Team Loutres — two otters holding hands (they do that for real) |
| `spr.avatar.lions` | 32×32 | Team Lions — lion + lioness, smug faces |
| `spr.avatar.pandas` | 32×32 | Team Pandas — one upside down |
| `spr.avatar.frogs` | 32×32 | Team Grenouilles — one mid-jump |
| `spr.avatar.foxes` | 32×32 | Team Renards — sly grins |
| `spr.avatar.ducks` | 32×32 | Team Coin-Coin — rubber-duck yellow |
| `spr.avatar.cats` | 32×32 | Team Chats — one asleep, obviously |
| `spr.avatar.pizzas` | 32×32 | Team Pizzas — two slices, pepperoni hearts |
| `spr.avatar.cocktails` | 32×32 | Team Cocktails — two clinking martinis, one cherry |
| `spr.ui.btn` | 9-slice | Chunky pixel button (normal / pressed / disabled states) |
| `spr.ui.panel` | 9-slice | Dialog/card frame with pixel border |
| `spr.ui.dots` | 8×8 ×3 | Progress dots (empty / current / done) |
| `spr.ui.heart` | 16×16 | Heart (points, life, love) |
| `spr.ui.spark` | 16×16 | VS spark / hit star |
| `spr.ui.crown` | 24×24 | Winner crown |
| `spr.ui.skull` | 16×16 | Pixel skull (mismatch 💀) |
| `spr.ui.lock` | 16×16 | "Secret" padlock |
| `spr.ui.eye.no` | 16×16 | Crossed-out eye ("no peeking") |
| `spr.ui.gear` | 16×16 | Settings |
| `spr.ui.pause` | 16×16 | Pause |
| `spr.ui.flag.fr` / `spr.ui.flag.en` | 16×12 | Language toggle flags |
| `spr.ui.confetti` | 8×8 ×4 | Confetti particles (4 shapes, tinted in code) |

Team names (also strings): `team.penguins` Les Manchots / The Penguins · `team.otters` Les Loutres / The Otters · `team.lions` Les Lions / The Lions · `team.pandas` Les Pandas / The Pandas · `team.frogs` Les Grenouilles / The Frogs · `team.foxes` Les Renards / The Foxes · `team.ducks` Les Coin-Coin / The Quack-Quacks · `team.cats` Les Chats / The Cats · `team.pizzas` Les Pizzas / The Pizzas · `team.cocktails` Les Cocktails / The Cocktails

### Global sounds (Web Audio synth)

| Id | Trigger | Synthesis note |
|---|---|---|
| `sfx.tap` | any button press | 5ms square blip, ~880Hz, fast decay |
| `sfx.back` | back/cancel | same blip, pitched down (~440Hz) |
| `sfx.error` | invalid action | two low square notes falling (330→220Hz) |
| `sfx.whoosh` | view transitions | filtered noise sweep, 120ms |
| `mus.menu` | Home/setup screens (optional, off if sound off) | 4-bar chiptune loop, square lead + triangle bass, ~104 BPM, cheerful |

---

## 2. V-Splash

### Strings

| Key | FR | EN |
|---|---|---|
| `splash.loading` | Chargement… | Loading… |

### Assets

- `spr.logo.icon` animated: `anim.logo.clash` — the two hearts slide in from left/right, clash, `spr.ui.spark` pops, wordmark appears underneath.
- `sfx.splash.clash`: short white-noise hit + rising square arpeggio (3 notes), plays once on the clash.

---

## 3. V-Home

### Strings

| Key | FR | EN |
|---|---|---|
| `home.play` | JOUER | PLAY |
| `home.howto` | Comment on joue ? | How to play |
| `home.settings` | Réglages | Settings |
| `home.install.android` | Installe le jeu sur ton tel 📲 | Install the game on your phone 📲 |
| `home.install.ios` | Sur iPhone : Partager → « Sur l'écran d'accueil » | On iPhone: Share → "Add to Home Screen" |
| `home.install.dismiss` | Plus tard | Later |

### Assets

- `spr.logo` centered, `anim.logo.bounce` — slow 2-frame idle bob.
- Background: `spr.bg.hearts` — sparse tiling pixel hearts drifting up slowly (`anim.bg.drift`), very low contrast.
- Random pair of team avatars peeking from the bottom corners (`anim.peek` — slide up, blink, hide). Pure charm, cheap to do.
- `mus.menu` loop starts here (if sound on). `sfx.tap` on buttons.

---

## 4. V-HowToPlay

### Strings

| Key | FR | EN |
|---|---|---|
| `howto.title` | Comment on joue ? | How to play |
| `howto.flash.title` | ⚡ Flash | ⚡ Flash |
| `howto.flash.body` | L'un répond en secret, l'autre devine à voix haute. Les autres couples jugent si c'est assez proche. Puis on échange les rôles ! | One answers in secret, the other guesses out loud. The other couples judge if it's close enough. Then you swap roles! |
| `howto.dilemma.title` | 👉 Dilemme | 👉 Dilemma |
| `howto.dilemma.body` | Une question du genre « Qui de vous deux… ? ». 3, 2, 1 : chacun pointe quelqu'un du doigt. Même personne = point ! | A "Who of the two…?" question. 3, 2, 1: everyone points at someone. Same person = point! |
| `howto.ultime.title` | 👑 Ultime | 👑 Ultimate |
| `howto.ultime.body` | Le combo complet : Flash + Dilemme + une finale en rafale pour couronner le meilleur duo. | The full combo: Flash + Dilemma + a rapid-fire finale to crown the best duo. |
| `howto.swipe` | Balaye pour voir les autres modes | Swipe to see the other modes |

### Assets

- 3 mini demo scenes (looping, ~2s each), built from existing sprites + 2 new ones:
  - `spr.demo.phone` 24×32 — pixel phone with a "?" on screen.
  - `spr.demo.bubble` 24×16 — speech bubble with "…" (thinking) and "!" (answer) variants.
- `anim.demo.flash`: avatar A + phone + lock → bubble on avatar B → spark.
- `anim.demo.dilemma`: countdown digits over two avatars → both point (flip sprite) → heart or skull.
- `anim.demo.ultime`: crown descends on a winning pair.
- Sounds: reuse `sfx.tap`, plus muted preview of `sfx.countdown.tick` inside the dilemma demo.

---

## 5. V-Settings & V-Legal

### Strings

| Key | FR | EN |
|---|---|---|
| `settings.title` | Réglages | Settings |
| `settings.language` | Langue | Language |
| `settings.sound` | Sons | Sound |
| `settings.sound.on` | Activés | On |
| `settings.sound.off` | Coupés | Off |
| `settings.resetSeen` | Réinitialiser les questions vues | Reset seen questions |
| `settings.resetSeen.confirm` | Toutes les questions redeviendront inédites. Sûr·e ? | All questions will be fresh again. Sure? |
| `settings.resetSeen.done` | C'est tout propre ! | All fresh! |
| `settings.legal` | Mentions légales | Legal notice |
| `legal.title` | Mentions légales | Legal notice |
| `legal.body` | Couple Battle™ est un jeu en cours de développement. Marque et concept déposés par ses créateurs. Contact : aylo.srd@gmail.com. Ce site ne collecte aucune donnée personnelle : tout reste dans ton navigateur. | Couple Battle™ is a game under development. Trademark and concept belong to its creators. Contact: aylo.srd@gmail.com. This site collects no personal data: everything stays in your browser. |

### Assets

- `spr.ui.gear`, `spr.ui.flag.*`, toggle switch sprite `spr.ui.toggle` (on/off, 24×12).
- `sfx.toggle`: two-note square up (on) / down (off).

---

## 6. V-Setup (teams)

### Strings

| Key | FR | EN |
|---|---|---|
| `setup.title` | Qui s'affronte ce soir ? | Who's battling tonight? |
| `setup.couples.count` | Combien de duos ? | How many duos? |
| `setup.couples.solo.hint` | À deux ? Mode duel : battez votre record ! | Just you two? Duel mode: beat your own record! |
| `setup.team.pick` | Duo {n} : choisissez votre équipe ! | Duo {n}: pick your team! |
| `setup.team.taken` | Déjà pris ! | Already taken! |
| `setup.names.title` | Qui joue chez {team} ? | Who's playing for {team}? |
| `setup.names.p1` | Prénom joueur·euse 1 | Player 1 first name |
| `setup.names.p2` | Prénom joueur·euse 2 | Player 2 first name |
| `setup.names.required` | Il nous faut vos deux prénoms ! | We need both your first names! |
| `setup.ready` | Tout le monde est là ! | Everyone's in! |

### Assets

- The 8 `spr.avatar.*` in a picker grid; selected = `anim.avatar.selected` (bounce + spark), taken = grayscale + `spr.ui.lock`.
- `anim.avatar.hello`: on selection, the avatar does a 2-frame wave.
- `sfx.select`: rising square arpeggio (2 notes); `sfx.error` when picking a taken avatar.

---

## 7. V-ModeSelect

### Strings

| Key | FR | EN |
|---|---|---|
| `mode.title` | Choisissez votre bataille | Pick your battle |
| `mode.flash.name` | ⚡ Flash | ⚡ Flash |
| `mode.flash.dur` | ~10 min | ~10 min |
| `mode.flash.desc` | Rapide et sans pitié : devinez les réponses de l'autre. | Fast and merciless: guess each other's answers. |
| `mode.dilemma.name` | 👉 Dilemme | 👉 Dilemma |
| `mode.dilemma.dur` | ~15 min | ~15 min |
| `mode.dilemma.desc` | 3, 2, 1… pointez ! Même réponse = point. | 3, 2, 1… point! Same answer = point. |
| `mode.ultime.name` | 👑 Ultime | 👑 Ultimate |
| `mode.ultime.dur` | 30+ min | 30+ min |
| `mode.ultime.desc` | Le grand format, pour couronner le duo suprême. | The full experience, to crown the supreme duo. |

### Assets

- 3 mode cards using `spr.ui.panel`; each card has a badge sprite: `spr.mode.flash` (16×16 lightning), `spr.mode.dilemma` (16×16 pointing hand), `spr.mode.ultime` (reuse `spr.ui.crown`).
- `anim.card.hover`: subtle tilt/bob on the focused card.
- `sfx.select` on pick.

## 8. V-DifficultySelect

### Strings

| Key | FR | EN |
|---|---|---|
| `diff.title` | Niveau de difficulté ? | Difficulty level? |
| `diff.mix.name` | Mix | Mix |
| `diff.mix.desc` | Un peu de tout, comme la vie. | A bit of everything, like life. |
| `diff.easy.name` | Love Starter | Love Starter |
| `diff.easy.desc` | Tranquille : les basiques du quotidien. | Chill: everyday basics. |
| `diff.medium.name` | Duo Boost | Duo Boost |
| `diff.medium.desc` | Ça se corse : goûts, souvenirs, opinions. | Heating up: tastes, memories, opinions. |
| `diff.hard.name` | Duo Xplosif | Duo Xplosif |
| `diff.hard.desc` | Zone rouge : secrets et vérités jamais dites. | Red zone: secrets and unspoken truths. |
| `themes.title` | Thèmes (optionnel) | Themes (optional) |
| `themes.hint` | Tout est coché sauf… ce que vous décochez. | Everything's on except… what you switch off. |
| `themes.intimacy.groupWarn` | 🔥 Amour & Intimité : désactivé en groupe par défaut. À vos risques et périls ! | 🔥 Love & Intimacy: off by default in group games. Enable at your own risk! |
| `theme.homeDaily` | Maison & Quotidien | Home & Daily Life |
| `theme.foodDrinks` | Food & Boissons | Food & Drinks |
| `theme.travel` | Voyages & Vacances | Travel & Holidays |
| `theme.workAmbition` | Taf & Ambitions | Work & Ambition |
| `theme.hobbies` | Loisirs & Divertissement | Hobbies & Entertainment |
| `theme.goingOut` | Sorties & Vie sociale | Going Out & Social Life |
| `theme.money` | Argent & Shopping | Money & Shopping |
| `theme.childhood` | Enfance & Passé | Childhood & Past |
| `theme.personality` | Personnalité & Habitudes | Personality & Habits |
| `theme.dreams` | Rêves & Futur | Dreams & Future |
| `theme.loveIntimacy` | Amour & Intimité | Love & Intimacy |
| `theme.random` | Random & Chaos | Random & Chaotic |

### Assets

- Difficulty badges: `spr.diff.mix` (16×16 shuffle arrows), `spr.diff.easy` (one heart), `spr.diff.medium` (two hearts), `spr.diff.hard` (heart on fire).
- 12 theme icons 16×16 (`spr.theme.*`): house, pizza slice, plane, briefcase, gamepad, cocktail, coin, teddy bear, masks, shooting star, flame-heart, dice.
- `sfx.toggle` on theme switches, `sfx.select` on difficulty.

## 9. V-ModeGuidelines

### Strings

| Key | FR | EN |
|---|---|---|
| `guide.title.flash` | Règles du Flash | Flash rules |
| `guide.title.dilemma` | Règles du Dilemme | Dilemma rules |
| `guide.title.ultime` | Règles de l'Ultime | Ultimate rules |
| `guide.flash.s1` | {name} répond à 3 questions en secret. | {name} secretly answers 3 questions. |
| `guide.flash.s2` | Son/sa partenaire devine à voix haute. | Their partner guesses out loud. |
| `guide.flash.s3` | Les autres jugent : exact +2, presque +1. | The others judge: exact +2, close +1. |
| `guide.flash.s4` | Puis on échange les rôles ! | Then swap roles! |
| `guide.dilemma.s1` | Une question s'affiche pour tout le monde. | One question shows for everyone. |
| `guide.dilemma.s2` | 3, 2, 1 : chacun pointe quelqu'un du doigt. | 3, 2, 1: everyone points at someone. |
| `guide.dilemma.s3` | Même personne dans le duo = +1 point. | Same person within the duo = +1 point. |
| `guide.ultime.s1` | Manches 1 & 2 : comme au Flash. | Rounds 1 & 2: like Flash. |
| `guide.ultime.s2` | Manche 3 : comme au Dilemme. | Round 3: like Dilemma. |
| `guide.ultime.s3` | Finale : réponses simultanées en rafale, les autres jugent 💖 ou 💀. | Finale: simultaneous rapid-fire answers, the others judge 💖 or 💀. |
| `guide.gotit` | C'est compris ! | Got it! |
| `guide.dontshow` | Ne plus afficher | Don't show again |

### Assets

- Reuses the `anim.demo.*` mini scenes from V-HowToPlay (same components).
- `sfx.tap` only.

---

## 10. FLASH — V-PassPhone

### Strings

| Key | FR | EN |
|---|---|---|
| `pass.secret.title` | Passez le téléphone à {name} ! | Pass the phone to {name}! |
| `pass.secret.sub` | Équipe {team} — les autres, on ne regarde pas 🙈 | Team {team} — everyone else, no peeking 🙈 |
| `pass.secret.confirm` | C'est moi, {name} ! | It's me, {name}! |
| `pass.back.title` | Reposez le téléphone au centre ! | Put the phone back in the middle! |
| `pass.back.sub` | Que tout le monde voie l'écran. | Everyone should see the screen. |
| `pass.back.confirm` | C'est bon ! | Done! |

### Assets

- Big team avatar + `spr.ui.eye.no` + `anim.pass.slide`: pixel phone sprite slides from one avatar to the other.
- `sfx.pass`: two quick whoosh blips (noise bursts, panned L→R if stereo).

## 11. FLASH — V-SecretAnswers

### Strings

| Key | FR | EN |
|---|---|---|
| `secret.title` | Chut, c'est secret 🤫 | Shh, it's secret 🤫 |
| `secret.progress` | Question {n}/{total} | Question {n}/{total} |
| `secret.placeholder` | Ta réponse (1 à 5 mots) | Your answer (1–5 words) |
| `secret.submit` | Verrouiller ma réponse 🔒 | Lock my answer 🔒 |
| `secret.locked` | Verrouillée ! Personne ne peut revenir en arrière. | Locked! No going back. |
| `secret.allDone` | Tes {total} réponses sont bien au chaud. | Your {total} answers are safely stored. |

### Assets

- Dimmed-corner "secret" vignette overlay (CSS, no sprite) + `spr.ui.lock`.
- `anim.lock.close`: padlock snaps shut on submit.
- `sfx.lock`: short metallic click (high square blip + instant noise tick).

## 12. FLASH — V-GuessReveal

### Strings

| Key | FR | EN |
|---|---|---|
| `guess.turn` | À toi {name} : devine ce que {partner} a répondu ! | Your turn {name}: guess what {partner} answered! |
| `guess.outloud` | Réponds à voix haute, puis révélez. | Answer out loud, then reveal. |
| `guess.reveal` | RÉVÉLER 🎴 | REVEAL 🎴 |
| `guess.answerWas` | {name} avait répondu : | {name} answered: |

### Assets

- `spr.card.back` 48×64: pixel card back (heart motif) — THE signature asset, it's on screen at every reveal.
- `anim.card.flip`: card flip (scaleX squash) revealing the written answer on `spr.card.front` (blank panel).
- `sfx.reveal`: quick riser (square slide up ~200ms) ending on a soft pop when the card lands.

## 13. FLASH — V-Judge

### Strings

| Key | FR | EN |
|---|---|---|
| `judge.title` | Verdict du public ? | Crowd verdict? |
| `judge.exact` | EXACT ! +2 | NAILED IT! +2 |
| `judge.close` | Presque… +1 | Close… +1 |
| `judge.miss` | Raté ! 0 | Missed! 0 |
| `judge.auto.match` | 💥 MATCH ! +2 | 💥 MATCH! +2 |
| `judge.auto.miss` | 💀 Raté ! | 💀 Missed! |

### Assets

- Three chunky verdict buttons (color-coded via `spr.ui.btn` tints).
- Result splash: `anim.points.pop` — "+2"/"+1" pixel number jumps out with `spr.ui.spark` (exact) / small heart (close) / `spr.ui.skull` (miss).
- `sfx.point.exact`: 3-note ascending square arpeggio (major). `sfx.point.close`: 2-note. `sfx.point.miss`: descending minor 2-note "womp".

---

## 14. DILEMMA — V-DilemmaQuestion

### Strings

| Key | FR | EN |
|---|---|---|
| `dilemma.getready` | Tout le monde est prêt ? | Everyone ready? |
| `dilemma.ready` | PRÊTS ! | READY! |
| `dilemma.rule` | Au top : pointez la personne du doigt ! | On zero: point at the person! |

### Assets

- Question displayed HUGE on `spr.ui.panel`, `spr.mode.dilemma` badge in header.
- `anim.question.drop`: question card drops in with a small bounce.
- `sfx.whoosh` on entry.

## 15. DILEMMA — V-Countdown

### Strings

| Key | FR | EN |
|---|---|---|
| `count.3` | 3 | 3 |
| `count.2` | 2 | 2 |
| `count.1` | 1 | 1 |
| `count.go` | POINTEZ ! | POINT! |

### Assets

- `spr.count.3/2/1/go`: giant pixel digits (48×64) + "POINTEZ !" burst frame.
- `anim.count.pulse`: each digit slams in, scales down, screen edge flashes.
- `sfx.countdown.tick`: woodblock-ish tick (short triangle blip, pitch rises 3→1) · `sfx.countdown.go`: bright major chord stab + noise burst. **The signature sound of the game — make it satisfying.**
- Light haptic per tick where supported (`navigator.vibrate`).

## 16. DILEMMA — V-DilemmaResolve

### Strings

| Key | FR | EN |
|---|---|---|
| `resolve.title` | Alors, {team} ? | So, {team}? |
| `resolve.question` | Vous avez pointé la même personne ? | Did you point at the same person? |
| `resolve.match` | 💥 MATCH ! +1 | 💥 MATCH! +1 |
| `resolve.miss` | ❌ Raté | ❌ Missed |
| `resolve.confirmed` | Duos déjà passés : | Already confirmed: |
| `resolve.liarStrip` | (mentir, c'est un point de karma en moins) | (lying costs you karma points) |

### Assets

- One card per team, stepped couple-by-couple: active card enlarged, others queued as small avatar chips with ✓/✗ result badges.
- `anim.resolve.advance`: confirmed card shrinks into the strip, next slides center.
- `sfx.point.exact` on match, `sfx.point.miss` on miss.

---

## 17. ULTIME — V-FinalRapidFire

### Strings

| Key | FR | EN |
|---|---|---|
| `final.intro.title` | 👑 LA FINALE | 👑 THE FINALE |
| `final.intro.body` | 5 questions en rafale. Répondez à voix haute EN MÊME TEMPS. Le public juge ! | 5 rapid-fire questions. Answer out loud AT THE SAME TIME. The crowd judges! |
| `final.turn` | Au tour de {team} ! | {team}, you're up! |
| `final.synchro` | 💖 SYNCHRO ! +2 | 💖 IN SYNC! +2 |
| `final.mismatch` | 💀 MISMATCH | 💀 MISMATCH |

### Assets

- Reuses countdown digits (shorter: 2 ticks), question panel, verdict buttons re-skinned 💖/💀.
- `anim.final.bg`: background subtly darkens + pixel spotlight cone on the active team's avatar.
- `mus.final`: tense 2-bar chiptune loop (minor arpeggio, faster ~128 BPM), only during the finale.
- `sfx.synchro`: sparkly 4-note major run · `sfx.mismatch`: sad trombone-ish 3 descending square notes.

---

## 18. V-Scoreboard (between rounds)

### Strings

| Key | FR | EN |
|---|---|---|
| `score.title` | Scores — Manche {n} | Scores — Round {n} |
| `score.leader` | {team} mène la danse ! | {team} leads the pack! |
| `score.tied` | Égalité parfaite ! | Perfectly tied! |
| `score.next` | Manche suivante → | Next round → |

### Assets

- Ranked rows: avatar + team name + animated score bar (`anim.score.fill` — bars race to their totals, pixel-step increments).
- Leader gets `spr.ui.crown` tilted at a jaunty angle.
- `sfx.score.tally`: rapid ticking while bars fill (blip per point), `sfx.point.exact` when the leader is revealed.

## 19. V-FinalResults

### Strings

| Key | FR | EN |
|---|---|---|
| `results.winner` | 👑 {team} remporte la bataille ! | 👑 {team} wins the battle! |
| `results.winner.sub` | {name1} & {name2}, duo légendaire. | {name1} & {name2}, legendary duo. |
| `results.solo.newBest` | Nouveau record : {points} pts ! | New best: {points} pts! |
| `results.solo.notBest` | {points} pts — votre record reste {best}. | {points} pts — your best is still {best}. |
| `results.stat.synchro` | Meilleure synchro : {team} | Best sync: {team} |
| `results.rematch` | REVANCHE ! | REMATCH! |
| `results.newgame` | Nouvelle partie | New game |

### Assets

- `anim.crown.drop`: crown falls onto the winning avatars, bounce, confetti burst (`spr.ui.confetti` particles).
- Losing avatars do `anim.avatar.cry` (2-frame slump) — pixel pathos.
- `mus.fanfare`: 2-second victory jingle (major fanfare, square+triangle), then silence (let the humans cheer).
- `sfx.confetti`: layered noise pops.

## 20. V-PauseSheet

### Strings

| Key | FR | EN |
|---|---|---|
| `pause.title` | Pause | Paused |
| `pause.resume` | Reprendre | Resume |
| `pause.restartRound` | Recommencer la manche | Restart round |
| `pause.quit` | Quitter la partie | Quit game |
| `pause.quit.confirm` | Sûr·e ? Les scores seront perdus. | Sure? Scores will be lost. |

### Assets

- `spr.ui.panel` overlay; `mus.*` ducks to 30% volume while open. `sfx.tap`.

---

## 21. Consolidated inventories

### Sprites to draw (28 unique + variants)

| Priority | Assets |
|---|---|
| P0 (blocks everything) | `spr.logo`, `spr.logo.icon` (+ PWA icon exports), 8 × `spr.avatar.*`, `spr.ui.btn`, `spr.ui.panel` |
| P1 (core game feel) | `spr.card.back/front`, `spr.count.*` digits, `spr.ui.crown`, `spr.ui.heart`, `spr.ui.skull`, `spr.ui.spark`, `spr.ui.lock`, `spr.ui.dots` |
| P2 (polish) | `spr.mode.*`, `spr.diff.*`, 12 × `spr.theme.*`, `spr.ui.eye.no`, `spr.ui.gear`, `spr.ui.pause`, `spr.ui.toggle`, `spr.ui.flag.*`, `spr.ui.confetti`, `spr.demo.phone`, `spr.demo.bubble`, `spr.bg.hearts` |

### Sounds to synthesize (all Web Audio, one `sound.ts` module)

| Priority | Ids |
|---|---|
| P0 | `sfx.tap`, `sfx.countdown.tick`, `sfx.countdown.go`, `sfx.reveal`, `sfx.point.exact/close/miss` |
| P1 | `sfx.lock`, `sfx.select`, `sfx.pass`, `sfx.score.tally`, `sfx.synchro`, `sfx.mismatch`, `mus.fanfare` |
| P2 | `sfx.whoosh`, `sfx.back`, `sfx.error`, `sfx.toggle`, `sfx.confetti`, `sfx.splash.clash`, `mus.menu`, `mus.final` |

### Animation inventory

`anim.logo.clash` · `anim.logo.bounce` · `anim.bg.drift` · `anim.peek` · `anim.demo.flash/dilemma/ultime` · `anim.avatar.selected/hello/cry` · `anim.card.hover/flip` · `anim.pass.slide` · `anim.lock.close` · `anim.points.pop` · `anim.question.drop` · `anim.count.pulse` · `anim.resolve.advance` · `anim.final.bg` · `anim.score.fill` · `anim.crown.drop`

All CSS keyframes or tiny JS — no animation library needed at MVP.

### Notes

- Every string above ships in `fr.json` / `en.json` keyed exactly as in these tables; FR is the fallback language.
- Music (`mus.*`) is P2 and entirely optional — the game must feel complete with SFX only.
- Sound module: single `AudioContext`, unlocked on first user tap (iOS requirement), master gain respects `settings.sound`.
