# Multi-stage Dockerfile for rad-engineer
# Stage 1: Builder - install dependencies and build
FROM oven/bun:1.1.38-alpine AS builder

WORKDIR /app

# Copy package files (bun.lock is the lockfile name in newer bun versions)
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for typecheck)
# Use --ignore-scripts to skip electron postinstall (not needed in Docker)
RUN bun install --frozen-lockfile --ignore-scripts

# Copy source code and configuration
COPY tsconfig.json ./
COPY src ./src
COPY test ./test

# Run type checking and build
RUN bun run typecheck

# Stage 2: Production runtime
FROM oven/bun:1.1.38-alpine AS runtime

# Install dumb-init for proper signal handling and wget for healthcheck
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S radeng && \
    adduser -S -u 1001 -G radeng radeng

WORKDIR /app

# Copy only production dependencies from builder
COPY --from=builder --chown=radeng:radeng /app/node_modules ./node_modules
COPY --from=builder --chown=radeng:radeng /app/package.json ./

# Copy application code
COPY --chown=radeng:radeng tsconfig.json ./
COPY --chown=radeng:radeng src ./src

# Create directories for runtime data
RUN mkdir -p /app/data /app/logs /app/.checkpoints /app/.audit && \
    chown -R radeng:radeng /app/data /app/logs /app/.checkpoints /app/.audit

# Switch to non-root user
USER radeng

# Expose ports
# 3000: Main application (if HTTP server is added)
# 9090: Prometheus metrics endpoint (default)
EXPOSE 3000 9090

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:3000/health/live || exit 1

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    METRICS_PORT=9090 \
    LOG_LEVEL=info

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command - run the server
CMD ["bun", "run", "src/server.ts"]
