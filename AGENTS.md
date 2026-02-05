# Swiparr - Agent Development Guide

## Project Overview

**Swiparr** is a Jellyfin, Emby, Plex, and TMDB integration web application that provides a Tinder-like swipe interface for browsing and rating media content. Built with Next.js 16+ App Router, React 19, TypeScript, and Tailwind CSS v4.

## Available Commands

### Development & Building
```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Database Operations
```bash
# Generate Drizzle migrations
npx drizzle-kit generate

# Push schema changes to database
npx drizzle-kit push

# Studio UI for database management
npx drizzle-kit studio
```

**Note**: No test framework is currently configured. When adding tests, consider Vitest or Jest with React Testing Library.

## Technology Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.x (strict mode enabled)
- **Runtime**: Node.js 24+
- **React**: 19.2.3 with React Compiler enabled
- **Styling**: Tailwind CSS v4 with CSS-in-JS
- **Database**: SQLite with Drizzle ORM
- **State Management**: Zustand + TanStack React Query
- **Validation**: Zod
- **Authentication**: iron-session
- **HTTP Client**: Axios

## Configuration Files

- `next.config.ts` - Next.js configuration with standalone output, security headers, and image optimization
- `tsconfig.json` - TypeScript configuration with strict mode and path aliases
- `drizzle.config.ts` - Database schema and migration configuration
- `tailwind.config.ts` - Styling configuration (if present)
- `eslint.config.mjs` - ESLint rules (not found - using Next.js defaults)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API route handlers
│   │   ├── admin/         # Admin endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── jellyfin/      # Jellyfin integration endpoints
│   │   ├── session/       # Session management
│   │   └── user/          # User data endpoints
│   ├── login/             # Login page
│   └── page.tsx           # Main application page
├── components/            # React components
├── db/                    # Database layer
│   ├── schema.ts          # Drizzle ORM schema definitions
│   └── migrations/        # Database migrations
├── lib/                   # Utility libraries
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── styles/               # Global styles
```

## Code Style Guidelines

### Imports & Module System

- **ES Modules**: Project uses `"type": "module"` in package.json
- **Path Aliases**: Use `@/*` to import from `src/*` directory
  ```typescript
  // Good
  import { db } from '@/lib/db'
  
  // Avoid
  import { db } from '../../../lib/db'
  ```
- **Named Imports**: Prefer named imports for clarity
- **Grouping**: Group imports as: 1) external libs, 2) internal aliases, 3) relative imports

### Naming Conventions

- **Files**: Use kebab-case for files (e.g., `user-service.ts`)
- **Components**: PascalCase for React components (e.g., `UserCard.tsx`)
- **Types**: PascalCase with descriptive names (e.g., `SessionMember`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Functions**: camelCase for regular functions
- **Hooks**: Prefix with `use` (e.g., `useSession`)
- **Database Tables**: PascalCase singular (e.g., `Session`, `Like`)
- **API Routes**: kebab-case matching endpoint paths

### TypeScript Patterns

- **Strict Mode**: Enabled - always define return types for functions
- **Type Inference**: Use `InferSelectModel` and `InferInsertModel` for Drizzle tables
- **Schema Types**: Export both select and insert types:
  ```typescript
  export type Session = InferSelectModel<typeof sessions>
  export type NewSession = InferInsertModel<typeof sessions>
  ```
- **Avoid `any`**: Use `unknown` or proper types instead
- **Generics**: Use meaningful generic type parameter names

### Database Schema

- **Table Names**: PascalCase singular (Session, Like, Config)
- **Columns**: camelCase with descriptive names
- **Primary Keys**: Use `id` for PKs (text for UUID, integer for auto-increment)
- **Timestamps**: Use `createdAt` with default `sql`CURRENT_TIMESTAMP``
- **Foreign Keys**: Use explicit references with cascade deletes
- **Unique Constraints**: Use Drizzle's `uniqueIndex` for compound unique constraints
- **Boolean Flags**: Use `integer` with `{ mode: "boolean" }`

### API Route Handlers

- **File Structure**: Use route.ts for each endpoint segment
- **HTTP Methods**: Export named functions for GET, POST, PUT, DELETE
- **Error Handling**: Return proper HTTP status codes with JSON responses
- **Validation**: Use Zod for request body validation
- **Type Safety**: Define proper TypeScript types for request/response bodies
- **Session Management**: Use iron-session for authentication state

### React Components

- **File Extensions**: Use `.tsx` for components with JSX
- **Props Types**: Define explicit TypeScript interfaces for props
- **Default Export**: Export components as default
- **Client Components**: Use `'use client'` directive when needed (forms, events)
- **Server Components**: Default to server components for data fetching
- **Hooks**: Follow React hooks rules (only call at top level, prefix with `use`)

### Error Handling

- **API Routes**: Return structured error responses:
  ```typescript
  return Response.json({ error: 'Error message' }, { status: 400 })
  ```
- **Type Guards**: Use TypeScript type guards for runtime validation
- **Zod Schemas**: Define schemas for all external data
- **Try/Catch**: Wrap async operations in try/catch blocks
- **User Feedback**: Use Sonner for toast notifications

### Styling

- **Tailwind CSS**: Use v4 with utility-first approach
- **Component Variants**: Use `class-variance-authority` for component variants
- **Theme**: Use `next-themes` for dark/light mode support
- **Responsive**: Use mobile-first breakpoint strategy
- **Animations**: Use Framer Motion for complex animations

### State Management

- **Local State**: Use `useState` and `useReducer` for component state
- **Global State**: Use Zustand for cross-component state
- **Server State**: Use TanStack React Query for API data caching
- **URL State**: Use Next.js search params for shareable state
- **Form State**: Use React Hook Form with Zod validation

## Key Dependencies

- **Core**: next, react, react-dom, typescript
- **Database**: drizzle-orm, @libsql/client
- **Styling**: tailwindcss, class-variance-authority, clsx, tailwind-merge
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **UI**: @radix-ui/* for headless components
- **State**: zustand, @tanstack/react-query
- **HTTP**: axios
- **Auth**: iron-session
- **UI/UX**: framer-motion, sonner, lucide-react

## Database Notes

- **Development**: Uses `swiparr.db` file in project root
- **Production**: Uses `/app/data/swiparr.db` path
- **Migrations**: Automatically handled by Drizzle
- **Schema Location**: `src/db/schema.ts`
- **Backup**: Remember to backup the SQLite database file

## Environment Variables

Create `.env.local` for development:
```env
DATABASE_URL=file:swiparr.db
# Jellyfin server configuration
JELLYFIN_URL=http://your-jellyfin-server:8096
# Add other required variables
```

## Common Tasks

### Adding a New API Endpoint
1. Create route file in `src/app/api/[resource]/route.ts`
2. Export GET/POST/PUT/DELETE functions as needed
3. Add proper TypeScript types
4. Validate request body with Zod
5. Return appropriate HTTP status codes

### Adding a Database Table
1. Define table in `src/db/schema.ts`
2. Run `drizzle-kit generate` to create migration
3. Run `drizzle-kit push` to apply to database
4. Export TypeScript types for the table

### Adding a New Page
1. Create directory in `src/app/[page-name]/`
2. Add `page.tsx` with default component export
3. Use `'use client'` if component needs interactivity
4. Add metadata exports (title, description) as needed

## Performance Considerations

- **React Compiler**: Enabled for automatic optimization
- **Images**: Use Next.js Image component with remotePatterns configured
- **Data Fetching**: Use React Query for caching and stale-while-revalidate
- **Code Splitting**: Next.js handles automatic code splitting
- **Bundle Size**: Monitor with `npm run build` output

## Security

- **Session Management**: Uses encrypted cookies via iron-session
- **CORS**: Configured for Jellyfin server integration
- **Headers**: Security headers configured in next.config.ts
- **Validation**: All external input validated with Zod
- **SQL Injection**: Protected by Drizzle ORM parameterized queries
