# Multi-stage build for CropMind (API + Frontend)
# Single Cloud Run service serving both

FROM node:24-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# ============================================
# Builder - install deps, build API + frontend
# ============================================
FROM base AS builder

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build
RUN pnpm --filter @workspace/cropmind run build

# ============================================
# Runner - minimal production image
# ============================================
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV GOOGLE_GENAI_USE_VERTEXAI=true

# Copy API bundle
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Copy frontend static files
COPY --from=builder /app/artifacts/cropmind/dist/public ./public

# Install only the runtime external dependencies (not bundled by esbuild)
RUN npm init -y && npm install --no-save \
  @google/adk@0.5.0 \
  @modelcontextprotocol/sdk@1.27.1 \
  @google-cloud/storage@^7.17.1 \
  @google-cloud/opentelemetry-cloud-monitoring-exporter@^0.21.0 \
  @google-cloud/opentelemetry-cloud-trace-exporter@^3.0.0 \
  @opentelemetry/api@1.9.0 \
  @opentelemetry/api-logs@^0.205.0 \
  @opentelemetry/exporter-logs-otlp-http@^0.205.0 \
  @opentelemetry/exporter-metrics-otlp-http@^0.205.0 \
  @opentelemetry/exporter-trace-otlp-http@^0.205.0 \
  @opentelemetry/resource-detector-gcp@^0.40.0 \
  @opentelemetry/resources@^2.1.0 \
  @opentelemetry/sdk-logs@^0.205.0 \
  @opentelemetry/sdk-metrics@^2.1.0 \
  @opentelemetry/sdk-trace-base@^2.1.0 \
  @opentelemetry/sdk-trace-node@^2.1.0

RUN groupadd -r cropmind && useradd -r -g cropmind cropmind
RUN chown -R cropmind:cropmind /app
USER cropmind

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.cjs"]
