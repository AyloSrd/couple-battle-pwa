# Couple Battle PWA

Start every session by reading `BRIEF.md` (scope, phases, working agreement — phase gates are
hard stops). `ARCHITECTURE.md` is the architecture contract: it wins over convenience, always.
All pre-made inputs (questions, strings, sprites, sounds, tokens, docs, wireframes) live under
`handoff/` — copy them into `src/`/`public/` as BRIEF.md instructs, never edit them in place.

Commands: `pnpm install --frozen-lockfile` · `pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build`. Never use npm/yarn (lockfile and build-script policy are pnpm-only).
