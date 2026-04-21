# ---- Stage 1: install dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
# postinstall runs prisma generate; schemas must exist before npm ci
COPY prisma ./prisma
COPY prisma-mongo ./prisma-mongo
RUN npm ci --frozen-lockfile

# ---- Stage 2: build ----
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage 3: production runner ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output (set in next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma: schema + migrations (for migrate deploy) + generated client
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs

EXPOSE 3000

# Railway injects PORT at runtime; HOSTNAME=0.0.0.0 makes Next.js bind on all interfaces
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run pending migrations, then start the server.
# Invoke Prisma via its real entry point — copying .bin/prisma resolves the
# symlink to a plain file, breaking the relative WASM path resolution.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma && node server.js"]
