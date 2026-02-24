# Multi-stage build for RTC Project Manager
FROM node:22-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile

FROM base AS builder

# Copy source code
COPY . .

# Build the application
RUN pnpm build

FROM base AS tools

# Full source + dev dependencies for migrations, seeding, and diagnostics
COPY . .

# Production stage
FROM node:22-alpine AS runtime

# Install pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install full dependencies: runtime server imports vite in this build
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/seed-database.mjs ./seed-database.mjs
COPY --from=builder /app/seed-database-old.mjs ./seed-database-old.mjs

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
