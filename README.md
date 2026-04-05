# CropMind - APAC Agricultural Intelligence Network

**Built with Google Agent Development Kit (ADK) + Vertex AI + MCP + Cloud Run**

> A multi-agent AI system for crop diagnosis serving smallholder farmers across APAC. Combines Google Vertex AI Gemini models, ADK agent orchestration, MCP tool servers, and pgvector intelligence for accurate, actionable agricultural recommendations.

## Links

| Resource | URL |
|----------|-----|
| **Repository (submission)** | [github.com/brlikhon/Crop-Mind-](https://github.com/brlikhon/Crop-Mind-) |
| **Repository (full history)** | [github.com/brlikhon/CropMind](https://github.com/brlikhon/CropMind) |
| **Live app (Cloud Run)** | [cropmind-api — us-central1](https://cropmind-api-16140643786.us-central1.run.app/) |
| **Health check** | [`GET /api/healthz`](https://cropmind-api-16140643786.us-central1.run.app/api/healthz) |

## Competition Submission

- **Track**: Track 1 - Build and Deploy AI Agents using ADK
- **Live demo**: [Cloud Run deployment](https://cropmind-api-16140643786.us-central1.run.app/) (Express API + React SPA in one service)
- **API base**: `https://cropmind-api-16140643786.us-central1.run.app/api`

## Problem Statement

Smallholder farmers in APAC face critical challenges:

- **Limited access** to agricultural extension services
- **Language barriers** preventing access to expert knowledge
- **Time-sensitive** crop disease decisions with high economic impact
- **Fragmented information** across weather, market, and treatment domains

## Solution Architecture

CropMind uses **Google ADK** to orchestrate four specialist agents behind an **Express 5** API. The same agricultural tools are exposed as a standards-compliant **MCP** server (SSE) for external clients. **PostgreSQL + pgvector** backs semantic case search and structured crop data; production uses **AlloyDB** on Google Cloud with **Direct VPC Egress** from Cloud Run.

Diagrams below use **[Mermaid](https://mermaid.js.org/)** syntax — they render automatically on GitHub and in many Markdown viewers.

### System overview

```mermaid
flowchart TB
  subgraph users["Clients"]
    U[Browser / API clients]
  end

  subgraph cr["Google Cloud Run — cropmind-api"]
    E[Express 5]
    R["/api — REST + SSE"]
    S["Static React SPA"]
  end

  subgraph ai["AI & tools"]
    V[Vertex AI — Gemini 2.5 Flash / Pro]
    MCPsrv[MCP server — weather, alerts, prices, subsidies]
    OM[Open-Meteo API]
  end

  subgraph data["Data plane"]
    DB[(PostgreSQL / AlloyDB + pgvector)]
  end

  U --> E
  E --> R
  E --> S
  R --> V
  R --> MCPsrv
  MCPsrv --> OM
  R --> DB
  MCPsrv --> DB
```

### Orchestrator execution pipeline

The orchestrator (`runOrchestrator`) runs **QueryParser** (structured JSON extraction), then **CropDiseaseAgent** first, **Weather** and **Market** agents **in parallel** when routing rules allow, applies **conflict resolution**, runs **TreatmentProtocolAgent** when a diagnosis exists, and finishes with **SynthesisAgent** for the farmer-facing summary.

```mermaid
flowchart TD
  Q[Farmer text + optional image] --> P[QueryParser — LlmAgent + InMemoryRunner]
  P --> D[Phase 1 — CropDiseaseAgent]
  D --> W{Invoke weather?}
  D --> Mkt{Invoke market?}
  W -->|yes| PW[WeatherAdaptationAgent]
  Mkt -->|yes| PM[MarketSubsidyAgent]
  PW --> PAR[Promise.all — parallel]
  PM --> PAR
  PAR --> CR[Conflict resolution]
  CR --> TR{Treatment needed?}
  TR -->|yes| T[TreatmentProtocolAgent]
  TR -->|no| SYN[SynthesisAgent]
  T --> SYN
  SYN --> OUT[OrchestratorResult + optional SSE stream]
```

## Google Cloud Services Used

### Core AI Services

- **Vertex AI Gemini 2.5 Flash** — Specialist agents (disease, weather, market, treatment)
- **Vertex AI Gemini 2.5 Pro** — Orchestrator parsing and final synthesis (see `artifacts/api-server/src/agents/config.ts`)
- **Vertex AI gemini-embedding-001** — Semantic similarity (768-dim vectors) for historical cases

### Infrastructure

- **Cloud Run** — Single service: API + static frontend (see root `Dockerfile`)
- **AlloyDB for PostgreSQL** — Production database with pgvector (private IP; app access via Direct VPC Egress)
- **Artifact Registry** — Container images for Cloud Run
- **Secret Manager** — e.g. `DATABASE_URL` for Cloud Run
- **Cloud Build** — `cloudbuild.yaml` builds and deploys the image

### Agent Development Kit (ADK)

- **`LlmAgent`** — Specialist agents and orchestrator sub-agents (parser, synthesis)
- **`InMemoryRunner`** — ADK execution loop for agents
- **`FunctionTool`** — Binds real tools (weather API, DB-backed MCP tools) to agents

### Model Context Protocol (MCP)

- **`@modelcontextprotocol/sdk`** — MCP server implementation
- **SSE transport** — Tool access for MCP clients (see API routes under `/api/mcp`)

### Key Features

- **Phased + parallel execution** — Disease first; weather and market concurrent when invoked
- **Conflict resolution** — e.g. moisture contradictions, treat vs. replant (see `resolveConflicts` in `orchestrator.ts`)
- **Streaming** — `POST /api/cropagent/diagnose/stream` (Server-Sent Events)
- **Multimodal input** — Optional image upload on diagnose endpoints
- **Rate limiting** — Diagnose routes limited (see `cropagent.ts`)
- **Vector knowledge base** — Similar historical cases via pgvector

## Technology Stack

### Backend

- **Runtime**: Node.js 24
- **Framework**: Express 5
- **Language**: TypeScript
- **AI**: Google ADK 0.5 (`@google/adk`)
- **MCP**: `@modelcontextprotocol/sdk`
- **Database**: PostgreSQL + pgvector (Drizzle ORM)
- **Validation**: Zod
- **Build**: esbuild (CJS bundle for `api-server`)

### Frontend

- **Framework**: React 19
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **State / data**: TanStack React Query
- **Routing**: Wouter

### Monorepo

- **Package manager**: pnpm workspaces
- **API contract**: OpenAPI 3.1 (`lib/api-spec`) — Orval generates clients and Zod where configured

## Project Structure

```
cropmind/
├── Dockerfile                 # Production: API bundle + React dist → one Cloud Run image
├── cloudbuild.yaml            # Build & deploy to Cloud Run
├── artifacts/
│   ├── api-server/            # Express API — ADK agents, MCP, routes
│   │   └── src/
│   │       ├── agents/        # Orchestrator + 4 specialist agents
│   │       ├── mcp/           # MCP tools (weather, DB-backed data)
│   │       ├── vectors/       # Embeddings + similar-case search
│   │       └── routes/        # health, cropagent, mcp, cases
│   └── cropmind/              # React dashboard (Vite)
├── lib/
│   ├── db/                    # Drizzle schema, migrations, seeds
│   ├── api-spec/              # OpenAPI
│   ├── api-zod/               # Generated Zod
│   ├── api-client-react/      # Generated React Query hooks
│   └── integrations-google-vertex-ai-server/
└── README.md
```

## API Overview

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/healthz` | Liveness + database connectivity |
| `POST` | `/api/cropagent/diagnose` | Multipart or JSON — full diagnosis JSON |
| `POST` | `/api/cropagent/diagnose/stream` | SSE stream of orchestrator events |
| `POST` | `/api/cases/submit` | Submit outcome data for the knowledge base |
| Various | `/api/mcp/*` | MCP SSE and related endpoints |

## Quick Start

### Prerequisites

- Google Cloud account (for Vertex AI in cloud deployments)
- Node.js 24+ and pnpm
- PostgreSQL with pgvector for local full functionality

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/brlikhon/Crop-Mind-.git
cd Crop-Mind-

# 2. Install dependencies
pnpm install

# 3. Google Cloud credentials (Vertex AI)
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# 4. Database
export DATABASE_URL=postgresql://user:password@localhost:5432/cropmind
pnpm --filter @workspace/db run push
npx tsx lib/db/seed-mcp.ts
npx tsx lib/db/seed-cases.ts

# 5. API server
pnpm --filter @workspace/api-server run dev

# 6. Frontend (separate terminal)
pnpm --filter @workspace/cropmind run dev
```

### Deploy to Google Cloud

```bash
gcloud builds submit --config cloudbuild.yaml
```

Configure **VPC egress**, **Secret Manager** (`DATABASE_URL`), and **service account** access to Vertex AI in the Google Cloud console for production; `cloudbuild.yaml` deploys the root `Dockerfile` to Cloud Run.

## Example Queries

1. **Rice disease**: "My rice plants in Punjab have brown spots on leaves and yellowing. Planted 6 weeks ago."
2. **Tomato problem**: "Tomato plants in Maharashtra showing wilting despite watering. Stems have dark streaks."
3. **Market query**: "Should I treat my wheat crop with rust or replant? Current market price?"

### What You'll See

- **Agent execution** — Traces per agent; streaming variant emits `agent_started`, `agent_completed`, `mcp_tool_call`, etc.
- **MCP tool calls** — Weather (Open-Meteo), DB-backed alerts, prices, subsidies when available
- **Conflict resolution** — Logged when disease, weather, and market findings disagree
- **Final recommendation** — Plain-language synthesis for farmers
- **Similar cases** — pgvector retrieval when the database is available

## Impact Potential

### Target Users

- **500M+ smallholder farmers** across APAC
- **Agricultural extension workers** needing decision support
- **NGOs and cooperatives** serving farming communities

### Scalability

- **Serverless** — Cloud Run scales with demand
- **Cost-aware** — Specialist agents use Flash; orchestration uses Pro where configured
- **Multi-language ready** — Gemini supports many languages for queries and answers

## Technical Highlights

### 1. ADK agent execution

Specialist agents are real `LlmAgent` instances run through `InMemoryRunner`, with tools bound via `FunctionTool` — not one-off prompt strings.

### 2. MCP server

Tools are implemented with `@modelcontextprotocol/sdk` and exposed for external MCP clients over SSE (see `artifacts/api-server/src/routes/mcp.ts`).

### 3. Hybrid vector search

Similar-case retrieval combines semantic similarity with outcome weighting (see `artifacts/api-server/src/vectors/`).

---

## License

MIT License

## Acknowledgments

- **Google Cloud** for Vertex AI, ADK, and Cloud Run
- **Open-Meteo** for weather data
- **FAO** for crop disease reference context

---

**Built for Google Gen AI Academy APAC 2026** | Track 1: Build and Deploy AI Agents using ADK
