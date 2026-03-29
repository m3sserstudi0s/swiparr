# Swiparr — Claude Code Guide

This file is the authoritative reference for Claude Code sessions. It supersedes `AGENTS.md` for AI-assisted work (do not delete `AGENTS.md` — it may be used by other tools).

## Project Overview

**Swiparr** is a Tinder-like media discovery tool for Jellyfin, Emby, Plex, and TMDB. Users swipe on movies/shows in real-time multiplayer sessions; a match triggers when all session members swipe right on the same item.

- **Framework**: Next.js 16 (App Router), React 19 (React Compiler enabled)
- **Styling**: Tailwind CSS v4, Framer Motion
- **Database**: SQLite with Drizzle ORM (`@libsql/client`)
- **State**: Zustand (global UI), TanStack React Query v5 (server data), React Hook Form (forms)
- **Auth**: iron-session (httpOnly cookies, 1-year expiry)
- **Validation**: Zod v4

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Set version + run migrations + TypeScript check + build
npm run db:migrate   # Apply pending migrations (runs automatically on build)
npx drizzle-kit generate  # Generate migration from schema changes
npx drizzle-kit push      # Push schema directly (dev only)
npx drizzle-kit studio    # Database GUI
```

> **Windows note**: `npm run lint` fails on this machine due to spaces in the path (`c:\My Stuff\Home Server\swiparr`). This is a pre-existing Next.js CLI issue — not a code problem. Use `npm run build` as the reliable verification step (it includes TypeScript checking).

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Main swipe interface (root route)
│   ├── login/page.tsx      # Auth / login
│   ├── layout.tsx          # Root layout with providers
│   ├── api/                # REST API routes (route.ts files)
│   │   ├── session/        # Session management (create, join, settings, members)
│   │   ├── media/          # Media fetching and item detail
│   │   ├── swipe/          # Swipe recording
│   │   ├── likes/          # Liked and matched items
│   │   ├── admin/          # Admin actions (requests queue, etc.)
│   │   ├── events/         # SSE real-time event stream
│   │   └── user/           # User settings and profile pictures
│   └── error.tsx, not-found.tsx, global-error.tsx
│
├── components/
│   ├── ui/                 # shadcn-style UI primitives (41+ components)
│   ├── deck/               # CardDeck, SwipeCard, DeckControls, MatchOverlay
│   ├── session/            # SessionManager, SessionHeader, UserAvatarList
│   ├── home/               # SettingsSidebar, Changelog, settings/*
│   ├── likes/              # LikesList, LikesFilter
│   ├── login/              # LoginContent, AuthView
│   ├── movie/              # MovieDetailProvider, MovieListItem
│   ├── profile/            # ProfilePicturePicker
│   └── animate-ui/         # Animation primitives (tabs, effects, highlights)
│
├── db/
│   ├── schema.ts           # Drizzle table definitions
│   ├── migrate.js          # Migration runner
│   └── migrations/         # Numbered SQL migrations + snapshots
│
├── hooks/
│   ├── api/                # TanStack Query hooks (use-deck, use-session, use-likes, etc.)
│   │   ├── index.ts        # Barrel export
│   │   └── query-keys.ts   # Centralized query key factory
│   └── useConfettiBurst.ts # Confetti animation (fork-specific)
│
├── lib/
│   ├── providers/          # Multi-provider abstraction
│   │   ├── factory.ts      # Singleton provider instantiation
│   │   ├── types.ts        # Provider interfaces & capabilities matrix
│   │   ├── jellyfin/       # Jellyfin implementation
│   │   ├── tmdb/           # TMDB implementation (fork: language filtering)
│   │   ├── plex/           # Plex implementation
│   │   └── emby/           # Emby implementation
│   ├── services/
│   │   ├── media-service.ts     # Media fetching pipeline (fork: language filters)
│   │   ├── session-service.ts   # Session and swipe management
│   │   ├── auth-service.ts      # Authentication and authorization
│   │   ├── config-service.ts    # Config persistence
│   │   ├── event-service.ts     # SSE real-time events
│   │   └── deck-cache.ts        # Deck data cache
│   ├── security/
│   │   ├── url-guard.ts    # Hardened URL validation
│   │   └── crypto.ts       # Encryption utilities
│   ├── api-client.ts       # Axios wrapper
│   ├── api-utils.ts        # Standardized error responses with correlation IDs
│   ├── changelog.ts        # In-app changelog data (fork-specific — see below)
│   ├── config.ts           # Env var schema (Zod) — fork adds TMDB_LANGUAGES, EXCLUDED_LANGUAGES
│   ├── constants.ts        # Constants — fork sets DEFAULT_TMDB_REGION = "US"
│   ├── session.ts          # iron-session config (fork: maxAge = 1 year)
│   ├── validations.ts      # Zod schemas for all API inputs
│   ├── user-store.ts       # Zustand: user profile updates
│   └── background-store.ts # Zustand: animated backgrounds
│
└── types/
    ├── media.ts            # MediaItem, MediaLibrary, MediaGenre, WatchProvider
    ├── session.ts          # Filters, SessionSettings, SessionStats, SessionMember
    ├── api.ts              # SwipePayload, SwipeResponse, SessionStatus, MergedLike
    ├── auth.ts             # Auth types
    └── image.ts            # Image response types
```

## Coding Conventions

### Imports & Path Aliases

Always use `@/*` for `src/*`. Never use relative paths for cross-directory imports.

```typescript
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/api'
```

Import order: 1) React/Next, 2) External libs, 3) Internal `@/*`, 4) Local relative.

### Naming

| Thing | Convention | Example |
|---|---|---|
| Logic files | `kebab-case.ts` | `media-service.ts` |
| Component files | `PascalCase.tsx` | `CardDeck.tsx` |
| Components | `PascalCase` | `MatchOverlay` |
| Hooks | `useCamelCase` | `useConfettiBurst` |
| API routes | `kebab-case` folders | `src/app/api/session/members/route.ts` |
| DB tables | `PascalCase` singular in code | `SessionMember` |

Prefer named exports for utilities/types; default exports for components/pages.

### TypeScript

- Strict mode is enabled — explicitly type all exported function return values.
- Use Zod for all external data validation (API request bodies, env vars, config).
- Infer Drizzle types from schema:
  ```typescript
  export type Session = InferSelectModel<typeof sessions>
  export type NewSession = InferInsertModel<typeof sessions>
  ```

### Components

- Add `'use client'` at the top of any file that uses hooks, event handlers, or browser APIs.
- Default to Server Components for data fetching (no directive needed).
- Styling: Tailwind CSS v4 + `cn()` utility (clsx + tailwind-merge) + CVA for variants.
- Animations: Framer Motion (`motion`) or `animate-ui` primitives.

### API Routes

```typescript
// src/app/api/resource/route.ts
export async function GET(request: Request) { ... }
export async function POST(request: Request) { ... }
export async function DELETE(request: Request) { ... }
```

- Return `NextResponse.json({ data }, { status: 200 })` for success.
- Use `handleApiError` / `createErrorResponse` from `@/lib/api-utils` for errors (adds correlation IDs).
- Validate all POST/DELETE bodies with Zod schemas from `@/lib/validations`.
- Check iron-session auth on all protected routes.

### Database (Drizzle)

- Use `text` for UUIDs/string IDs, `integer` for auto-increment.
- Use `integer({ mode: 'boolean' })` for booleans.
- Timestamps: `text('created_at').default(sql\`CURRENT_TIMESTAMP\`)`.
- Generate a migration after schema changes: `npx drizzle-kit generate`.

### State Management

| Use case | Tool |
|---|---|
| Global UI state | Zustand |
| Server data + caching | TanStack React Query v5 |
| Form state | React Hook Form + `zodResolver` |

Add new query keys to `src/hooks/api/query-keys.ts`. Export new hooks from `src/hooks/api/index.ts`.

### Error Handling

- Wrap async operations in `try/catch`.
- Surface errors to users via `sonner` toast notifications.
- Log errors to console with descriptive context in development.

## Changelog Requirements

**Every feature, bug fix, or improvement must update both changelog files before the PR is merged.**

### 1. `CHANGELOG.md` (Keep-a-Changelog format)

Add entries under the `[Unreleased]` section at the top of the file:

```markdown
## [Unreleased]

### Added
- Description of new feature

### Changed
- Description of changed behavior

### Fixed
- Description of bug fix
```

### 2. `src/lib/changelog.ts` (in-app display)

Add a new entry to the **top** of the `CHANGELOG` array (or append to the most recent version's `changes` array if it's the same version):

```typescript
{
  version: "1.x.y",
  date: "YYYY-MM-DD",
  changes: [
    { type: "feature", description: "User-facing description of new feature" },
    { type: "fix", description: "User-facing description of bug fix" },
    { type: "improvement", description: "User-facing description of improvement" },
  ],
},
```

- `type` must be one of: `"fix"` | `"feature"` | `"improvement"`
- `description` is shown to end users in the app — write it in plain language, not developer jargon
- Keep descriptions concise (one sentence)

### Version bumping

When cutting a release: bump the version in `package.json` and ensure both changelog files use the new version number. The build script (`scripts/set-app-version.mjs`) reads `package.json` to set the displayed app version.

## Fork-Specific Files (Preserve on Every Upstream Merge)

These files contain custom additions that must be re-applied or preserved when merging upstream changes:

| File | What it does |
|---|---|
| `src/hooks/useConfettiBurst.ts` | Confetti animation hook (new file — upstream doesn't have this) |
| `src/components/deck/MatchOverlay.tsx` | Imports `useConfettiBurst`, fires `onAnimationComplete` on match |
| `src/lib/providers/tmdb/index.ts` | Language filtering (`TMDB_LANGUAGES`, `EXCLUDED_LANGUAGES`), US region default |
| `src/lib/services/media-service.ts` | Language filter applied throughout item fetching pipeline |
| `src/lib/config.ts` | `TMDB_LANGUAGES` and `EXCLUDED_LANGUAGES` env vars added |
| `src/lib/constants.ts` | `DEFAULT_TMDB_REGION = "US"` |
| `src/lib/session.ts` | Cookie `maxAge` set to 1 year (upstream default is shorter) |
| `src/lib/changelog.ts` | In-app changelog helper (new file — upstream doesn't have this) |
| `.github/workflows/deploy.yml` | Homelab auto-deploy on push to master |
| `.github/workflows/claude.yml` | Claude PR assistant |
| `.github/workflows/claude-code-review.yml` | Claude code review |

## Upstream Sync Procedure

```bash
# 1. Fetch upstream changes
git fetch upstream

# 2. Create a backup branch before merging
git checkout -b backup/pre-upstream-sync-<branch>

# 3. Switch back and merge
git checkout <branch>
git merge upstream/master --no-ff

# 4. Resolve conflicts
#    Strategy: use upstream structure as the base, then re-apply fork additions above

# 5. Update both changelog files to document what changed in the sync

# 6. Verify the build
npm run build

# 7. Push and merge to master
```

## Verification

Use `npm run build` to verify changes — it runs TypeScript checking, migrations, and a full production build. Do not rely on `npm run lint` on Windows (path with spaces causes it to fail).
