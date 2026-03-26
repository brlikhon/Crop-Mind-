# Multi-stage build for CropMind API Server
# Optimized for Google Cloud Run deployment

FROM node:24-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# ============================================
# Dependencies stage - install all dependencies
# ============================================
FROM base AS deps

# Copy all package.json files for workspace packages
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/integrations-google-vertex-ai-server/package.json ./lib/integrations-google-vertex-ai-server/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# ============================================
# Builder stage - build the application
# ============================================
FROM base AS builder

# Copy all source code
COPY . .

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Build the API server
RUN pnpm --filter @workspace/api-server run build

# ============================================
# Runner stage - final production image
# ============================================
FROM node:24-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080
ENV GOOGLE_GENAI_USE_VERTEXAI=true

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib ./lib

# Copy built application from builder stage
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Copy package.json for metadata
COPY --from=builder /app/artifacts/api-server/package.json ./

# Create non-root user for security
RUN groupadd -r cropmind && useradd -r -g cropmind cropmind
RUN chown -R cropmind:cropmind /app
USER cropmind

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/index.cjs"]
