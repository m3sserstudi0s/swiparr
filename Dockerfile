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

# Prisma generate needs a URL during build
ENV DATABASE_URL="file:/tmp/build.db"
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- prod deps (ONLY production deps, includes prisma now) ----
FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4321

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# sqlite volume dir
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Next standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma files needed at runtime for migrate deploy
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
ENV PRISMA_CONFIG_PATH=/app/prisma.config.ts

# Ensure prisma CLI exists at runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json

USER nextjs
EXPOSE 4321

# Run migrations then start Next standalone server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]