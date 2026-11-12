# AGENTS.md — Messer Swipe

Agent contract for this repo. The product is **Messer Swipe**: a swipe deck over a Jellyfin, Emby,
Plex or TMDB library. Project skill: **`swiparr`** (load it first — it carries the live traps).

## What this is

A single-user-ish Next.js app that turns a media library into a Tinder-like deck, solo or in a group
session. One repo, one deployable container (`ghcr.io/jakobbjelver/messer-swipe`), one stack in
Komodo (`video-stack`). Providers are interchangeable behind one interface; a Jellyfin instance can
also mix TMDB streaming catalogues into the same deck ("hybrid").

## Read first

| File | Why |
|---|---|
| `MESSER.md` | UI adoption record: brand, canon version, deviations |
| `.github/CONTRIBUTING.md` | commit conventions (semantic-release reads them) |
| `AGENTS.md` (this file) | invariants and commands |
| `PROJECT.yaml` | machine-readable facts the audit cross-checks |
| `.hermes/plans/` | the shows/2.0 programme and its execution log |

## Layout

```
src/app/            routes: deck (/), login, /ui sink, /healthz, /readyz, api/*
src/components/     deck, movie, shows, session, likes, settings, ui (shadcn atoms, local)
src/lib/providers/  jellyfin | emby | plex | tmdb + factory, item-source, mappers
                    (map.ts is provider-free on purpose: unit tests import it)
src/lib/services/   media-service (deck assembly), session-service, auth-service
src/lib/            pure helpers with their own *.test.ts siblings
src/db/             drizzle schema + generated SQL migrations (src/db/migrations)
src/styles/messer/  generated canon files — never edited by hand
```

## Commands

```bash
npm ci                     # install (lockfile is committed)
npm run dev                # next dev on :3000 (needs a host-reachable JELLYFIN_URL)
npm run build              # migrations + next build
npm run lint               # eslint .
npm run typecheck          # tsc --noEmit  (authoritative; the patch tool's lint is not)
npm test                   # node --import tsx --test "src/**/*.test.ts"
npm run check              # lint + typecheck + test — run before every commit
npm run doctor             # env, provider reachability, db, version
npm run db:migrate         # apply migrations (tsx)
npm run db:generate        # new migration from schema changes
```

The canonical dev server is the Portal action (`actions/actions.json`, PM2 `messer-swipe-dev`) on
`dev-server.messer.wtf`; it overrides `JELLYFIN_URL` with the OrbStack name because a host process
cannot resolve Docker service names.

## Invariants

1. **`MediaItem.Kind` absent means movie.** Read it with `itemKind()`; never `?? "movie"` inline.
2. **`src/lib/providers/item-source.ts` is the only parser of typed ids** (`tmdb:movie:`, `tmdb:tv:`).
   For `getItemDetails` pass `detailsIdFor(id, providerType)`: TMDB needs the prefixed id, every other
   provider the bare one. Stripping first resolves a series to the film that shares its numeric id.
3. **A provider declares a capability only when its adapter exists.** `hasSeries`, `hasSeasons`,
   `hasProgress`, `hasNextUp` gate deck modes; a premature `true` renders an empty deck with no error.
4. **`deckMode` is derived, filter chips are not.** Storage carries `deckMode` + `kinds`; read them
   through `deckModeOf()` / `withDeckDefaults()` (`src/lib/deck-mode.ts`).
5. **Every provider is reachable only through the factory**, and the session's provider is the source
   of truth — never a client-supplied URL or provider.
6. **`src/proxy.ts` is the only middleware.** All request-level logic (CSP, auth, base-path rewrites)
   lives there; `next.config.ts` `headers()` is build-time and runs after the middleware.
7. **Mono is for machine values.** Badges use the `meta` variant; see `MESSER.md`.
8. **Icons are Phosphor** (`@phosphor-icons/react/dist/ssr`), `weight="fill"` only for state.
9. **A new provider mapper is a pure function** in a `map.ts` with no axios/Next import, so it is
   testable without a runtime.
10. **Tests are `node:test`.** Do not add vitest/jest; the lockfile cost is not worth it.

## Working rules

- Commits follow `.github/CONTRIBUTING.md`. `fix:` only for the first attempt at a bug; iterations use
  `chore:`, `refactor:` or `chore(fix):` — each `fix:` publishes a release on `master`.
- Branch: `develop` is the working branch, `master` releases. Never commit to `master` by hand.
- Commit as Jakob (`Jakob Bjelvér <jakobbjelver@gmail.com>`); Vercel only builds his commits.
- After changing a provider or the deck service, prove it through `/api/media/items` — a helper
  having a test is not evidence the deck uses it.
- Never accept a credential in chat; ask for a revocable token.
- Public communication (release notes, catalog PRs) is drafted for approval first.

## Where the depth is

- **Project skill `swiparr`** — provider traps, deploy and release flow, live verification recipes.
- `MESSER.md` — UI deviations with dates and exits.
- `.hermes/plans/2026-11-10_0015-messer-swipe-programme.md` — 2.0 scope and decisions.
- `CONTRIBUTING.md` — commit and review conventions.
