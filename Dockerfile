FROM node:20-alpine AS base

# ---- deps for build (includes dev deps) ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4321

RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# sqlite volume dir
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Next standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drizzle files needed at runtime
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrate.js ./src/db/migrate.js
# Ensure drizzle-orm and dotenv are available for the migration script
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv



USER nextjs
EXPOSE 4321

# Run migrations then start Next standalone server
CMD ["sh", "-c", "node src/db/migrate.js && node server.js"]
