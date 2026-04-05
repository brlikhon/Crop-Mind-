# CropMind

**Multi-agent crop intelligence for APAC smallholder farmers**

Google Agent Development Kit (ADK) · Vertex AI (Gemini) · Model Context Protocol (MCP) · Cloud Run

---

## Overview

CropMind is a production-oriented monorepo that combines an **Express 5** API, a **React** web app, and a **four-agent ADK pipeline** (disease, weather, market, treatment) with optional **multimodal** input (text + image). Agricultural tools are implemented as an **MCP-compatible** server; historical and structured data are stored in **PostgreSQL with pgvector** for semantic case search.

| Item | Details |
|------|---------|
| **Program** | Google Gen AI Academy APAC 2026 — **Track 1:** Build and Deploy AI Agents using ADK |
| **Live application** | [cropmind-api on Cloud Run (us-central1)](https://cropmind-api-16140643786.us-central1.run.app/) |
| **Source** | [github.com/brlikhon/CropMind](https://github.com/brlikhon/CropMind) |
| **License** | MIT |

---

## Why it matters

Smallholders in APAC often lack timely access to extension services, clear guidance across **weather**, **markets**, and **treatment**, and support in **local languages**. CropMind routes a single farmer query through specialized agents, resolves conflicting signals where needed, and returns a **plain-language** recommendation with **traceability** (agent steps, tool calls, and optional streaming).

---

## Architecture

Production ships as **one Cloud Run service**: the API under `/api` and static assets for the SPA. **Vertex AI** hosts Gemini models; **Open-Meteo** supplies weather where configured; the **database** (PostgreSQL / AlloyDB in GCP) holds alerts, prices, subsidies, and vectorized cases when available.

Diagrams use [Mermaid](https://mermaid.js.org/); they render on GitHub. Curves and spacing are tuned for clarity.

### High-level system

```mermaid
%%{init: {'flowchart': {'htmlLabels': true, 'curve': 'basis'}, 'theme': 'neutral'}}%%
flowchart TB
  classDef client fill:#1e3a5f,stroke:#0d2137,color:#f0f6fc
  classDef edge fill:#0969da,stroke:#0550ae,color:#fff
  classDef ai fill:#6f42c1,stroke:#553098,color:#fff
  classDef data fill:#1a7f37,stroke:#116329,color:#fff
  classDef ext fill:#656d76,stroke:#424a53,color:#f6f8fa

  subgraph L1["Client layer"]
    direction LR
    U(["Browser"]):::client
    P(["Integrations / scripts"]):::client
  end

  subgraph L2["Google Cloud Run — cropmind-api"]
    direction TB
    X["Express 5"]:::edge
    API["REST · SSE · JSON"]:::edge
    SPA["React SPA (static)"]:::edge
    X --> API
    X --> SPA
  end

  subgraph L3["Intelligence & tools"]
    direction TB
    V["Vertex AI · Gemini 2.5 Flash / Pro"]:::ai
    M["MCP tool layer"]:::ai
    O["Open-Meteo (weather)"]:::ext
    V --- M
    M --> O
  end

  subgraph L4["Data"]
    DB[("PostgreSQL · pgvector")]:::data
  end

  U --> X
  P --> API
  API --> V
  API --> M
  API --> DB
  M --> DB
```

### Orchestration pipeline

The orchestrator parses the query, runs **CropDiseaseAgent** first, optionally runs **Weather** and **Market** agents **in parallel**, applies **conflict resolution**, conditionally runs **TreatmentProtocolAgent**, then **synthesizes** a single farmer-facing answer. Streaming endpoints emit the same stages as Server-Sent Events.

```mermaid
%%{init: {'flowchart': {'htmlLabels': true, 'curve': 'basis'}, 'theme': 'neutral'}}%%
flowchart TB
  classDef phase fill:#ddf4ff,stroke:#0969da,color:#0d1117
  classDef agent fill:#f6f8fa,stroke:#656d76,color:#24292f
  classDef join fill:#fff8c5,stroke:#9a6700,color:#24292f
  classDef out fill:#dafbe1,stroke:#1a7f37,color:#0d1117

  IN([Farmer query · optional image]):::phase

  subgraph S1["Parse"]
    P["QueryParser · structured JSON"]:::agent
  end

  subgraph S2["Primary diagnosis"]
    D["CropDiseaseAgent"]:::agent
  end

  subgraph S3["Parallel specialists — when routed"]
    direction LR
    W["WeatherAdaptationAgent"]:::agent
    MK["MarketSubsidyAgent"]:::agent
  end

  J["Conflict resolution"]:::join
  TR{"Run treatment protocol?"}

  subgraph S4["Close-out"]
    T["TreatmentProtocolAgent"]:::agent
    SYN["SynthesisAgent · final narrative"]:::agent
  end

  END([OrchestratorResult · traces · optional SSE]):::out

  IN --> P --> D
  D --> W
  D --> MK
  W --> J
  MK --> J
  J --> TR
  TR -->|yes| T
  TR -->|no| SYN
  T --> SYN
  SYN --> END
```

---

## HTTP API (`/api`)

Base URL (production): `https://cropmind-api-16140643786.us-central1.run.app/api`

### Discovery

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api` | Service metadata and a machine-readable index of primary routes (JSON). |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/healthz` | Liveness; includes database probe status when the pool can connect. |

### Crop agent (rate-limited)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cropagent/diagnose` | **Body:** `query` (string, required). **Optional:** `image` file (`multipart/form-data`) — JPEG, PNG, WebP, or GIF, up to 10 MB. Returns full **JSON** diagnosis payload (traces, decisions, recommendation). |
| `POST` | `/api/cropagent/diagnose/stream` | Same inputs as diagnose; returns **Server-Sent Events** with progressive events (`agent_started`, `agent_completed`, `mcp_tool_call`, `synthesis_started`, `complete`, etc.). |

### Cases & vectors

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cases/search` | **JSON body:** `symptomsDescription` (required); optional `cropType`, `country`, `topK` (capped). Returns semantically similar historical cases. |
| `POST` | `/api/cases/submit` | **JSON body:** structured outcome fields (`cropType`, `country`, `region`, `symptomsText`, `diagnosis`, `treatmentApplied`, `outcomeScore` 0–1) for knowledge-base growth. |

### MCP (tools)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/mcp/sse` | **SSE** transport for MCP clients; establishes a session for tool streaming. |
| `POST` | `/api/mcp/messages` | Continuation endpoint for an active SSE session (`sessionId` query parameter). |
| `GET` | `/api/mcp/tools` | Lists registered tools (metadata). |
| `POST` | `/api/mcp/call` | **JSON body:** `toolName`, optional `params` — direct tool invocation for debugging or integrations. |

**Note:** Diagnose routes apply per-IP rate limiting (see `artifacts/api-server/src/routes/cropagent.ts`).

---

## Google Cloud & AI stack

| Layer | Components |
|-------|----------------|
| **Models** | Gemini 2.5 Flash (specialists), Gemini 2.5 Pro (orchestrator parse + synthesis), `gemini-embedding-001` for vectors — see `artifacts/api-server/src/agents/config.ts`. |
| **Runtime** | Cloud Run (`cropmind-api`), single container from root `Dockerfile` (API bundle + Vite `public/` assets). |
| **Data** | PostgreSQL-compatible store with **pgvector**; production may use **AlloyDB** with **Direct VPC Egress** from Cloud Run. |
| **Secrets** | e.g. `DATABASE_URL` via Secret Manager; Vertex access via runtime service account. |
| **CI/CD** | `cloudbuild.yaml` — build image, push, deploy to `us-central1`. |

**ADK usage:** `LlmAgent`, `InMemoryRunner`, `FunctionTool` for tool-bound agents. **MCP:** `@modelcontextprotocol/sdk` with SSE routes above.

---

## Technology summary

| Area | Stack |
|------|--------|
| **Backend** | Node.js 24, Express 5, TypeScript, `@google/adk`, Drizzle ORM, Zod, esbuild |
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, TanStack Query, Wouter, Framer Motion |
| **Contract** | OpenAPI 3.1 (`lib/api-spec`), generated clients (`lib/api-client-react`, `lib/api-zod`) |

---

## Repository layout

```
├── Dockerfile              # Production image: API + SPA
├── cloudbuild.yaml         # Cloud Build → Cloud Run
├── artifacts/
│   ├── api-server/         # ADK agents, MCP, routes, vectors
│   └── cropmind/           # React UI
├── lib/
│   ├── db/                 # Schema, migrations, seeds
│   ├── api-spec/           # OpenAPI source
│   ├── api-zod/            # Generated Zod types
│   ├── api-client-react/   # Generated API client
│   └── integrations-google-vertex-ai-server/
└── README.md
```

---

## Local development

**Requirements:** Node.js 24+, pnpm, PostgreSQL with pgvector (for full DB features), Google Cloud credentials for Vertex AI.

```bash
git clone https://github.com/brlikhon/CropMind.git
cd CropMind
pnpm install

export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

export DATABASE_URL=postgresql://user:password@localhost:5432/cropmind
pnpm --filter @workspace/db run push
npx tsx lib/db/seed-mcp.ts
npx tsx lib/db/seed-cases.ts

pnpm --filter @workspace/api-server run dev    # API
pnpm --filter @workspace/cropmind run dev       # UI (separate terminal)
```

## Deployment

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=COMMIT_SHA=$(git rev-parse HEAD) --project=YOUR_PROJECT_ID .
```

Configure VPC egress, secrets, and IAM for Vertex AI in your GCP project to match your environment.

---

## Example queries

1. *“My rice in Punjab has brown spots and yellowing; planted six weeks ago.”*  
2. *“Tomatoes in Maharashtra are wilting; stems show dark streaks.”*  
3. *“Wheat rust — treat or replant? What is the market doing?”*

---

## Acknowledgments

Google Cloud (Vertex AI, ADK, Cloud Run), Open-Meteo, and public agricultural knowledge bases referenced in agent prompts.

---

<p align="center">
  <strong>Google Gen AI Academy APAC 2026</strong> · Track 1: Build and Deploy AI Agents using ADK
</p>
