# Workspace

## Overview

CropMind — APAC Agricultural Intelligence Network. A multi-agent AI system for crop diagnosis serving 500M+ smallholder farmers. Uses ADK multi-agent orchestration, MCP tool servers, and AlloyDB vector intelligence.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-openai-ai-server`
- Multi-Agent System: `src/agents/` contains the CropMind multi-agent orchestration engine:
  - `types.ts` — shared type definitions for agents, sessions, traces
  - `session.ts` — agent session management and trace recording
  - `orchestrator.ts` — central controller that parses queries, runs sub-agents, synthesises results
  - `crop-disease-agent.ts` — CropDiseaseAgent (differential diagnosis)
  - `weather-agent.ts` — WeatherAdaptationAgent (climate impact analysis)
  - `market-agent.ts` — MarketSubsidyAgent (economic viability + subsidies)
  - `treatment-agent.ts` — TreatmentProtocolAgent (actionable treatment plan)
- MCP Tool Layer: `src/mcp/` contains the MCP-compatible tool server infrastructure:
  - `types.ts` — McpTool, McpToolSchema, McpToolResult, McpToolCallLog interfaces
  - `registry.ts` — central tool registry with listTools(), callTool(), call logging
  - `weather-tool.ts` — WeatherTool: real HTTP calls to Open-Meteo API for agricultural weather data
  - `crop-alert-tool.ts` — CropAlertTool: queries crop_alerts table for active pest/disease outbreaks
  - `market-price-tool.ts` — MarketPriceTool: queries market_prices table for APAC commodity prices
  - `subsidy-tool.ts` — SubsidyTool: queries subsidies table for government agricultural programs
- CropAgent route: POST /api/cropagent/diagnose — runs multi-agent orchestration
- MCP routes: GET /api/mcp/tools (list tool schemas), POST /api/mcp/call (invoke tool by name)
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/crop-alerts.ts` — crop_alerts table (pest/disease outbreak alerts, 12 rows seeded across 10 APAC countries)
- `src/schema/market-prices.ts` — market_prices table (commodity prices, 20 rows for 10 crops in 10 countries)
- `src/schema/subsidies.ts` — subsidies table (government support programs, 12 rows across 10 APAC countries)
- `seed-mcp.ts` — seed script for MCP data: `npx tsx lib/db/seed-mcp.ts`
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
