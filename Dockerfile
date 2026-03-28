# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root lockfile
COPY package-lock.json ./

# Copy frontend package files
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/frontend/package-lock.json ./apps/frontend/

# Install dependencies
RUN npm install --prefix apps/frontend

# Copy frontend source and root env
COPY .env ./
COPY apps/frontend ./apps/frontend

# Build for production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --prefix apps/frontend

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build artifacts
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs

EXPOSE 3000

# Next.js standalone server defaults to apps/frontend/server.js 
# when built from the monorepo root
CMD ["node", "apps/frontend/server.js"]
