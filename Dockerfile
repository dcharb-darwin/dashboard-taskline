# Multi-stage build for Darwin TaskLine
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install full dependency set: runtime server imports vite and docker workflow runs drizzle tooling in-container
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/seed-database.mjs ./seed-database.mjs

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Seed toggle — set to "true" to seed with sample data on container start
ENV SEED_ON_START=false

# Start via entrypoint (conditionally seeds, then starts app)
ENTRYPOINT ["./docker-entrypoint.sh"]
