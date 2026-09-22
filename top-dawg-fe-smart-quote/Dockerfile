# syntax=docker/dockerfile:1
#
# Top Dawg FE Smart Quote — production image.
#
# Multi-stage so the shipped image carries the compiled server and nothing
# else: no source, no dev dependencies, no .env. Next.js `output: standalone`
# traces exactly the modules the server imports, which keeps the runtime layer
# small and means a vulnerability in a build-only package is not deployed.

# ---------------------------------------------------------------- dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------- build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A build must never reach a real database, so the client is given a value that
# is well-formed but unusable. Nothing at build time connects; the real
# DATABASE_URL arrives as a runtime environment variable.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
# Ask for the self-contained server this image copies out below. Managed
# hosts build their own bundle and must not get this output.
ENV BUILD_STANDALONE=1
RUN npm run build

# --------------------------------------------------------------------- runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user. If the process is ever compromised it should not own
# the filesystem it is standing on.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Migrations and seeds run from the image too, so a deploy does not depend on
# a developer's laptop being able to reach the production database.
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=build --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=build --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=build --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
