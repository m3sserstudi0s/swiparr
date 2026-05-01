# Swiparr - Agent Development Guide

When you need to search docs, use `context7` tools.
If you are unsure how to do something, use `gh_grep` to search code examples from GitHub.

## Project Overview
**Swiparr** is a media discovery tool for Jellyfin, Emby, Plex, and TMDB, featuring a Tinder-like swipe interface.
- **Framework**: Next.js 16 (App Router), React 19 (React Compiler enabled)
- **Styling**: Tailwind CSS v4, Framer Motion
- **Database**: SQLite with Drizzle ORM
- **State**: Zustand (Global), TanStack Query (Server), React Hook Form (Forms)
- **Auth**: iron-session

## Available Commands

### Development & Building
```bash
npm run dev      # Start dev server
npm run build    # Run migrations and build for production
npm run lint     # Run ESLint
```

### Database Operations
```bash
npx drizzle-kit generate  # Create migration from schema
npm run db:migrate        # Apply migrations (uses tsx)
npx drizzle-kit push      # Push schema directly (dev)
npx drizzle-kit studio    # Database GUI
```

### Testing
*No test framework currently configured. Use standard Vitest/Jest patterns if adding.*

## Code Style Guidelines

### Imports & Project Structure
- **Path Aliases**: Always use `@/*` for `src/*`.
  ```typescript
  import { db } from '@/db'
  import { Button } from '@/components/ui/button'
  ```
- **Grouping**: 1. React/Next, 2. External libs, 3. Internal `@/*`, 4. Local relative.
- **Exports**: Prefer named exports for utilities/types; default exports for components/pages.

### Naming Conventions
- **Files**: `kebab-case.ts` (logic), `PascalCase.tsx` (components).
- **Components**: `PascalCase`.
- **Hooks**: `useCamelCase`.
- **Database**: Tables are `PascalCase` singular in code, camelCase in DB.
- **API**: `kebab-case` folder structure in `src/app/api/`.

### TypeScript & Types
- **Strict Mode**: Explicitly define return types for all exported functions.
- **Drizzle Types**:
  ```typescript
  export type User = InferSelectModel<typeof users>
  export type NewUser = InferInsertModel<typeof users>
  ```
- **Zod**: Use for all external data validation (API requests, config).

### Database Schema (`src/db/schema.ts`)
- Use `text` for IDs (UUIDs) or `integer` for auto-increment.
- Use `integer({ mode: 'boolean' })` for booleans.
- Use `createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)`.

### API Routes (`src/app/api/.../route.ts`)
- Use named exports for methods: `export async function GET(...)`.
- Return structured JSON: `return Response.json({ data }, { status: 200 })`.
- Standardize errors: `return Response.json({ error: 'Message' }, { status: 400 })`.

### React Patterns
- **Directives**: Use `'use client'` at the top of files requiring interactivity/hooks.
- **Server Components**: Default to Server Components for data fetching.
- **State**: Prefer `Zustand` for global UI state and `React Query` for server data.
- **Forms**: Use `react-hook-form` with `zodResolver`.

### Error Handling
- Wrap async operations in `try/catch`.
- Use `sonner` for user-facing toast notifications.
- Log errors to console with descriptive context in development.

### SOLID Principles
When designing and refactoring code, follow **SOLID** principles as closely as practical:

- **S — Single Responsibility**: Each class, module, or function should have one well-defined reason to change. Extract database queries from route handlers, separate UI logic from data-fetching, and isolate third-party API clients behind thin wrappers.
- **O — Open/Closed**: Prefer extending behaviour over modifying existing tested code. Use composition, dependency injection, and strategy patterns (e.g., provider-agnostic media-service layer) so new media sources can be added without touching core logic.
- **L — Liskov Substitution**: Subtypes must be substitutable for their base types. If a class extends another, it should not weaken preconditions or strengthen postconditions. Keep provider implementations (Jellyfin, Emby, Plex) consistent with their shared interface contract.
- **I — Interface Segregation**: Split large interfaces into smaller, focused ones. A component or service should not depend on methods it doesn't use. Prefer thin function signatures over fat interface classes.
- **D — Dependency Inversion**: Depend on abstractions, not concretions. Business logic should not directly import database drivers, HTTP clients, or UI frameworks — depend on interfaces that those adapters implement.

When applying SOLID, prioritise **SRP** and **DIP** as they deliver the most practical benefit in a Next.js codebase. Refactor opportunistically — don't over-engineer, but clean as you go.

## Project Structure
- `src/app`: Routes, Layouts, API.
- `src/components`: UI (shadcn-like), Layout, and Feature components.
- `src/db`: Schema and migration logic.
- `src/hooks`: Custom reusable hooks.
- `src/lib`: Services, API clients, utilities, runtime config (`config.ts`).
- `src/proxy.ts`: **Middleware** — request-level logic (auth, headers, URL rewrites).
- `src/types`: Shared TypeScript definitions.

### Middleware (`src/proxy.ts`)

Swiparr uses `src/proxy.ts` instead of the standard `src/middleware.ts`. This is a Next.js naming convention — the exported function is `proxy()` (not the default export pattern). The `config.matcher` export controls which routes the middleware applies to.

**Key rule**: all request-level logic (CSP headers, authentication, base-path rewrites) goes in `proxy.ts`. Never create a separate `middleware.ts`.

**Build-time vs runtime**: `next.config.ts` `headers()` is evaluated at **build time** during `next build`. It cannot read Docker runtime env vars. Any header that needs runtime configuration (e.g., `CSP_FRAME_ANCESTORS`, `X_FRAME_OPTIONS`) must be set in `proxy.ts` middleware, which runs at request time and can read `process.env`.

**Critical timing detail**: `next.config.ts` `headers()` runs **AFTER** middleware in Next.js. If you set a header in both places, the `next.config.ts` value will overwrite the middleware's value. For this reason, the entire `Content-Security-Policy` header was removed from `next.config.ts` and is now built entirely in `proxy.ts`. If you add a header to `next.config.ts` that the middleware also touches, the middleware's version will be silently lost.

**X-Frame-Options sync**: When `CSP_FRAME_ANCESTORS` is set to a value other than `'none'` or `DISABLED`, the `X-Frame-Options` header should be `SAMEORIGIN` (not `DENY`) to avoid conflicting with the permissive `frame-ancestors` CSP directive. Both headers are managed in `proxy.ts`.

## Key Dependencies
- `motion`: For animations.
- `tmdb-ts`: TMDB integration.
- `iron-session`: Auth state.
- `lucide-react`: Icons.
- `vaul`: Drawers/Sheets.
