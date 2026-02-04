# =============================================================================
# Delivr Server OTA - Multi-stage Dockerfile
# =============================================================================
# 
# Stages:
#   - base: Common dependencies
#   - development: Hot reload with nodemon + ts-node (for local dev)
#   - builder: Compiles TypeScript to JavaScript
#   - production: PM2 cluster mode with compiled JS (for deployment)
#
# Usage:
#   Development:  docker build --target development -t delivr-ota:dev .
#   Production:   docker build --target production -t delivr-ota:prod .
#
# =============================================================================

# -----------------------------------------------------------------------------
# Base stage - Common setup for all stages
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app/api

# Install common tools
RUN apk add --no-cache curl bash

# Copy package files for dependency installation
COPY api/package*.json ./
COPY api/tsconfig.json ./

# -----------------------------------------------------------------------------
# Development stage - Hot reload with nodemon
# -----------------------------------------------------------------------------
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm install

# Install global tools for development
RUN npm install -g nodemon ts-node

# Create symlink so module-alias paths (bin/script/*) resolve to source (script/*)
# This allows running TypeScript directly while using production path config
RUN mkdir -p bin && ln -sf ../script bin/script

EXPOSE 3010

# Use nodemon for hot reload
# -L: Legacy watch mode (polling, required for Docker volumes)
# --watch: Directories/files to watch for changes
# --ext: File extensions to trigger restart
CMD ["nodemon", \
     "-L", \
     "--watch", "script", \
     "--watch", ".env", \
     "--ext", "ts,json", \
     "--exec", "ts-node -r dotenv/config -T script/server.ts"]

# -----------------------------------------------------------------------------
# Builder stage - Compile TypeScript
# -----------------------------------------------------------------------------
FROM base AS builder

# Install all dependencies (need devDependencies for compilation)
RUN npm install

# Copy source code
COPY api/script ./script
COPY api/setup ./setup

# Build TypeScript
RUN npm run build

# -----------------------------------------------------------------------------
# Production stage - PM2 cluster mode
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app/api

# Install curl for health checks
RUN apk add --no-cache curl

# Install PM2 globally
RUN npm install -g pm2

# Copy package files and install production dependencies only
COPY api/package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/api/bin ./bin

# Copy PM2 config (Docker-specific, no cwd - uses WORKDIR)
COPY pm2/pm2-docker.json /app/pm2/pm2-docker.json

# Copy any static assets/views if needed
COPY api/script/views ./bin/script/views

EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3010/health || exit 1

# Run with PM2 in cluster mode
CMD ["pm2-runtime", "start", "/app/pm2/pm2-docker.json"]
