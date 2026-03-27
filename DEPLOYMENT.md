# 🌱 CropMind — Project Documentation

> **Live URL:** https://cropmind-api-16140643786.us-central1.run.app/
> **GCP Project:** `YOUR_PROJECT_ID` | **Region:** `us-central1`
> **Last Deployed Revision:** `cropmind-api-00005-tpf` (image tag: `v6`)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Multi-Agent AI System](#3-multi-agent-ai-system)
4. [MCP Tools (Model Context Protocol)](#4-mcp-tools-model-context-protocol)
5. [Vector Search — RAG Pipeline](#5-vector-search--rag-pipeline)
6. [API Endpoints](#6-api-endpoints)
7. [Infrastructure Components](#7-infrastructure-components)
8. [Why AlloyDB Still Needs a Bastion VM](#8-why-alloydb-still-needs-a-bastion-vm)
9. [AlloyDB Schema & Seed Data](#9-alloydb-schema--seed-data)
10. [Current Database Status](#10-current-database-status)
11. [Dockerfile & Build Pipeline](#11-dockerfile--build-pipeline)
12. [Deployment Pipeline](#12-deployment-pipeline)
13. [Environment Variables & Secrets](#13-environment-variables--secrets)
14. [Bug History & Fixes](#14-bug-history--fixes)
15. [Known Issues & Next Steps](#15-known-issues--next-steps)
16. [APAC Data Coverage](#16-apac-data-coverage)
17. [Competition Context](#17-competition-context)
18. [Quick Reference Commands](#18-quick-reference-commands)

---

## 1. Project Overview

CropMind is an AI-powered agricultural assistant API built on **Node.js / Express 5**, deployed to **Google Cloud Run**, and backed by **AlloyDB (PostgreSQL-compatible)**. It leverages Google's Vertex AI (Gemini) for generative features and is containerised via Docker with images stored in **Artifact Registry**.

The system uses a **multi-agent orchestration** pattern where a central Orchestrator routes farmer queries to specialised AI agents (Disease, Weather, Market, Treatment), resolves conflicts between their findings, and synthesises a final recommendation — all powered by Gemini models via Vertex AI.

**Tech Stack:**

| Layer | Technology |
|---|---|
| Runtime | Node.js v24 |
| Framework | Express 5 |
| Language | TypeScript (compiled to CJS via esbuild bundler) |
| Database | AlloyDB for PostgreSQL (private VPC) + pgvector |
| AI / LLM | Vertex AI — Gemini 2.5 Pro (orchestrator), Gemini 2.5 Flash (agents) |
| Embeddings | Vertex AI — `gemini-embedding-001` (768 dimensions) |
| Agent Framework | Google ADK (`@google/adk@0.5.0`) |
| MCP Protocol | `@modelcontextprotocol/sdk@1.27.1` (SSE transport) |
| Hosting | Google Cloud Run (fully managed, serverless) |
| Container Registry | Google Artifact Registry (`us-central1-docker.pkg.dev`) |
| Build System | Google Cloud Build (`e2-highcpu-8`) |
| Secrets | Google Secret Manager |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet / Client                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               Google Cloud Run (cropmind-api)                   │
│  - Fully managed, serverless                                    │
│  - Image: us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind/api  │
│  - Memory: 1Gi  CPU: 1  Timeout: 300s                          │
│  - Direct VPC Egress (private-ranges-only)  ◄──────────────┐   │
│                                                             │   │
│  ┌─────────────────────────────────────────────────────┐    │   │
│  │              Express 5 API Server                   │    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────┐           │    │   │
│  │  │ /api/    │  │ /api/    │  │ /api/   │           │    │   │
│  │  │ cropagent│  │ mcp/     │  │ cases/  │           │    │   │
│  │  │ /diagnose│  │ tools    │  │ search  │           │    │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬────┘           │    │   │
│  │       │              │             │                │    │   │
│  │       ▼              ▼             ▼                │    │   │
│  │  ┌─────────────────────────────────────────────┐    │    │   │
│  │  │          Multi-Agent Orchestrator            │    │    │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │    │   │
│  │  │  │ Disease  │ │ Weather  │ │ Market   │    │    │    │   │
│  │  │  │ Agent    │ │ Agent    │ │ Agent    │    │    │    │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘    │    │    │   │
│  │  │  ┌──────────┐ ┌──────────────────────────┐ │    │    │   │
│  │  │  │Treatment │ │ Conflict Resolution +    │ │    │    │   │
│  │  │  │ Agent    │ │ Synthesis (Gemini 2.5Pro)│ │    │    │   │
│  │  │  └──────────┘ └──────────────────────────┘ │    │    │   │
│  │  └─────────────────────────────────────────────┘    │    │   │
│  └─────────────────────────────────────────────────────┘    │   │
└──────────────────────────────┬──────────────────────────────┼───┘
                               │ Private VPC (default network) │
              ┌────────────────┴──────────────────────────────┘
              │
      ┌───────┴────────┐                ┌───────────────────┐
      │   Vertex AI    │                │  AlloyDB Cluster  │
      │  Gemini 2.5    │                │  (Private VPC)    │
      │  Pro / Flash   │                │  ┌─────────────┐  │
      │  + Embeddings  │                │  │ crop_cases   │  │
      │  gemini-       │                │  │ crop_alerts  │  │
      │  embedding-001 │                │  │ market_prices│  │
      └────────────────┘                │  │ subsidies    │  │
                                        │  │ conversations│  │
                                        │  │ messages     │  │
                                        │  └─────────────┘  │
                                        └───────────────────┘
                                                 ▲
                                                 │ Private IP Only
                                        ┌────────┴──────────┐
                                        │  Bastion VM       │
                                        │  (Compute Engine) │
                                        │  psql client      │
                                        │  ⚠️ STOPPED       │
                                        └───────────────────┘
```

---

## 3. Multi-Agent AI System

CropMind uses a **5-phase orchestration** pattern powered by Google's Agent Development Kit (ADK):

### 3.1 AI Models Used

| Role | Model | Max Tokens | Temperature |
|------|-------|-----------|-------------|
| **Orchestrator** (Query Parser + Synthesis) | `gemini-2.5-pro` | 4096 | 0.1 (parsing) / 0.5 (synthesis) |
| **Specialist Agents** (Disease, Weather, Market, Treatment) | `gemini-2.5-flash` | 8192 | Varies per agent |
| **Vector Embeddings** | `gemini-embedding-001` | N/A | N/A |

### 3.2 Agent Roster

| Agent | Source File | Responsibility | Invocation Rule |
|-------|------------|----------------|-----------------|
| **QueryParser** | `orchestrator.ts` | Extracts structured fields (crop, region, symptoms, intent) from natural language | Always — first step |
| **CropDiseaseAgent** | `crop-disease-agent.ts` | Diagnoses plant diseases from symptoms and/or uploaded images | Always — primary diagnostic |
| **WeatherAdaptationAgent** | `weather-agent.ts` | Provides weather forecasts and agricultural impact analysis | Skipped if no region/country specified or if intent is `market_inquiry` |
| **MarketSubsidyAgent** | `market-agent.ts` | Market prices, trends, trade intelligence, and government subsidies | Skipped if no crop type specified or if intent is `weather_concern` |
| **TreatmentProtocolAgent** | `treatment-agent.ts` | Synthesises diagnosis + weather + market data into actionable treatment plans | Skipped if disease diagnosis failed or intent is `market_inquiry` |
| **SynthesisAgent** | `orchestrator.ts` | Merges all agent findings into a single farmer-friendly recommendation | Always — final step |

### 3.3 Orchestration Flow (5 Phases)

```
Phase 1: Parse Query
  └─▶ QueryParser (gemini-2.5-pro) → Structured FarmerQuery

Phase 2: Disease Diagnosis (always)
  └─▶ CropDiseaseAgent (gemini-2.5-flash) → DiagnosisResult

Phase 3: Weather + Market (parallel, conditional)
  ├─▶ WeatherAdaptationAgent (gemini-2.5-flash) → WeatherAssessment
  └─▶ MarketSubsidyAgent (gemini-2.5-flash) → MarketIntelligence

Phase 4: Conflict Resolution + Treatment (sequential)
  ├─▶ resolveConflicts() → moisture_contradiction, treat_vs_replant
  └─▶ TreatmentProtocolAgent (gemini-2.5-flash) → TreatmentProtocol

Phase 5: Synthesis
  └─▶ SynthesisAgent (gemini-2.5-pro) → Final Recommendation
```

### 3.4 Conflict Resolution

The orchestrator automatically detects and resolves two types of conflicts:

| Conflict Type | Agents | Resolution Logic |
|---------------|--------|-----------------|
| `moisture_contradiction` | Disease ↔ Weather | Real-time weather data overrides symptom-inferred moisture conditions |
| `treat_vs_replant` | Disease ↔ Market | If diagnosis confidence ≥ 80%, favor treatment; otherwise, favor market economics |

### 3.5 Streaming Support (SSE)

The `/api/cropagent/diagnose/stream` endpoint provides real-time Server-Sent Events:

```
data: {"type":"agent_started","agentName":"CropDiseaseAgent"}
data: {"type":"agent_completed","agentName":"CropDiseaseAgent","trace":{...}}
data: {"type":"agent_started","agentName":"WeatherAdaptationAgent"}
data: {"type":"mcp_tool_call","call":{...}}
data: {"type":"agent_completed","agentName":"WeatherAdaptationAgent","trace":{...}}
data: {"type":"synthesis_started"}
data: {"type":"complete","result":{...}}
data: [DONE]
```

---

## 4. MCP Tools (Model Context Protocol)

CropMind implements the **Model Context Protocol** via `@modelcontextprotocol/sdk` with SSE transport. The agents invoke these tools to query real data from AlloyDB.

### 4.1 Registered Tools

| Tool Name | Source File | Data Source | Description |
|-----------|------------|-------------|-------------|
| `weather` | `weather-tool.ts` | External weather API | Current weather conditions and forecasts by region |
| `crop-alerts` | `crop-alert-tool.ts` | AlloyDB `crop_alerts` (16 rows) | Active APAC agricultural threat alerts |
| `market-prices` | `market-price-tool.ts` | AlloyDB `market_prices` (20 rows) | Current crop market prices across APAC |
| `subsidies` | `subsidy-tool.ts` | AlloyDB `subsidies` (12 rows) | Government support programs across APAC |

### 4.2 MCP Server Architecture

- **SSE endpoint:** `GET /api/mcp/sse` → Opens an SSE session
- **Message endpoint:** `POST /api/mcp/messages?sessionId=<id>` → Sends messages to an active session
- **Tool discovery:** `GET /api/mcp/tools` → Lists all available tools
- **Direct call:** `POST /api/mcp/call` → Invoke a tool without an SSE session
- **Call logging:** Last 500 tool calls are stored in-memory for debugging

---

## 5. Vector Search — RAG Pipeline

CropMind implements Retrieval-Augmented Generation (RAG) using pgvector in AlloyDB.

### 5.1 Embedding Pipeline

```
User Symptoms (text)
      │
      ▼
gemini-embedding-001 (Vertex AI)
  outputDimensionality = 768
      │
      ▼
768-dimensional float vector
      │
      ▼
pgvector ANN search (cosine distance ⇔ operator)
  against crop_cases.embedding column
      │
      ▼
Top-K candidates (default K=5, max K=20)
      │
      ▼
Weighted Ranking:
  weightedScore = 0.6 × similarityScore + 0.4 × outcomeScore
      │
      ▼
Results returned to agent as RAG context
```

### 5.2 Key Configuration

| Parameter | Value |
|-----------|-------|
| Embedding model | `gemini-embedding-001` |
| Dimensions | 768 (using MRL `outputDimensionality`) |
| Distance function | Cosine similarity (`<=>` pgvector operator) |
| Similarity weight | 60% |
| Outcome weight | 40% |
| Default top-K | 5 |
| Max top-K | 20 |
| Candidate multiplier | `max(topK × 2, 10)` |
| Fallback | Deterministic text-hash embeddings if Vertex AI is unavailable |

### 5.3 Case Submission

New crop cases can be submitted via `POST /api/cases/submit`. They are automatically embedded with `gemini-embedding-001` and inserted into the vector store, improving future recommendations.

---

## 6. API Endpoints

All API routes are prefixed with `/api`.

### 6.1 Core Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/api/healthz` | Health check — returns `{"status":"ok"}` | Public | None |
| `POST` | `/api/cropagent/diagnose` | Full multi-agent diagnosis (JSON response) | Public | 5 req/min |
| `POST` | `/api/cropagent/diagnose/stream` | Streaming diagnosis via Server-Sent Events | Public | 5 req/min |

### 6.2 Vector Search Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/cases/search` | Vector similarity search on crop cases | Public |
| `POST` | `/api/cases/submit` | Submit a new crop case (auto-embedded) | Public |

### 6.3 MCP Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/mcp/sse` | Open SSE session for MCP protocol | Public |
| `POST` | `/api/mcp/messages` | Send message to active MCP session | Public |
| `GET` | `/api/mcp/tools` | List all registered MCP tools | Public |
| `POST` | `/api/mcp/call` | Directly invoke an MCP tool by name | Public |

### 6.4 Static Files (SPA)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/*` | React SPA — served via `express.static()` + catch-all middleware |

### 6.5 Diagnosis Request/Response

**Request:**
```bash
curl -X POST https://cropmind-api-16140643786.us-central1.run.app/api/cropagent/diagnose \
  -H "Content-Type: application/json" \
  -d '{"query": "My rice plants in Punjab have brown spots on leaves and yellowing"}'
```

**Image upload (multipart):**
```bash
curl -X POST https://cropmind-api-16140643786.us-central1.run.app/api/cropagent/diagnose \
  -F "query=What disease does this plant have?" \
  -F "image=@diseased_leaf.jpg"
```

**Response structure:**
```json
{
  "sessionId": "orch-abc123",
  "query": { "rawQuery": "...", "cropType": "rice", "region": "Punjab", "country": "India", "symptoms": ["brown spots", "yellowing"] },
  "diagnosis": { "diseaseName": "...", "confidence": 0.85, ... },
  "weatherAssessment": { ... },
  "marketIntelligence": { ... },
  "treatmentProtocol": { ... },
  "finalRecommendation": "Your rice plants are showing signs of...",
  "confidenceScore": 0.82,
  "traces": [ ... ],
  "orchestratorDecisions": [ ... ],
  "conflictResolutions": [ ... ],
  "mcpToolCalls": [ ... ],
  "totalDurationMs": 4523
}
```

### 6.6 Rate Limiting

The `/api/cropagent/diagnose` and `/api/cropagent/diagnose/stream` endpoints are rate-limited:

| Parameter | Value |
|-----------|-------|
| Window | 60 seconds |
| Max requests per window | 5 |
| Headers | Standard (`RateLimit-*`) |
| Image upload max size | 10 MB |
| Accepted image types | JPEG, PNG, WebP, GIF |
| Query max length | 5,000 characters |

---

## 7. Infrastructure Components

### 7.1 Cloud Run Service

| Property | Value |
|---|---|
| Service name | `cropmind-api` |
| Region | `us-central1` |
| Platform | Managed (serverless) |
| Min instances | 0 (scales to zero) |
| Max instances | 10 |
| Memory | 1 GiB |
| CPU | 1 vCPU |
| Request timeout | 300 seconds |
| VPC network | `default` |
| VPC subnet | `default` |
| VPC egress | `private-ranges-only` (Direct VPC Egress) |
| Auth | `--allow-unauthenticated` (public API) |

### 7.2 AlloyDB

- **Type:** AlloyDB for PostgreSQL (fully managed, Google-operated)
- **Network:** Private VPC — no public IP address
- **Extensions:** `vector` (pgvector), `google_ml_integration`
- **Why no public IP?** This is by design. AlloyDB is built for high security and performance inside GCP's private network fabric.
- **Connection from Cloud Run:** Via Direct VPC Egress — Cloud Run is virtually "inside" the VPC, so it can reach AlloyDB's private IP directly.
- **Connection string:** Stored securely in **Google Secret Manager** under the secret name `cropmind-database-url`.

### 7.3 Artifact Registry

- **Repository:** `us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind`
- **Images built:** `api:v1` through `api:v6`
- **Build machine:** `e2-highcpu-8` (Cloud Build)

### 7.4 Secret Manager

| Secret Name | Description |
|---|---|
| `cropmind-database-url` | Full PostgreSQL connection string for AlloyDB |

### 7.5 Cost Summary

| Resource | Running Cost | Stopped Cost |
|----------|-------------|-------------|
| Cloud Run | ~$0 (scales to zero) | $0 |
| AlloyDB | ~$1.50/day | ~$0.10/day (storage only) |
| Bastion VM | ~$0.50/day (e2-micro) | $0 |
| Vertex AI (Gemini) | Pay per request | $0 |
| Artifact Registry | Negligible storage | Negligible |

---

## 8. Why AlloyDB Still Needs a Bastion VM

This is a common point of confusion: *"If AlloyDB is fully managed, why do we need a separate VM at all?"*

### The Core Reason: AlloyDB is Private by Design

AlloyDB **does not and cannot** expose a public IP address. It lives entirely inside your Google Cloud VPC. Your laptop, sitting outside that VPC, has no way to reach it directly — even though AlloyDB itself is "managed" (meaning Google handles the server, patching, backups, etc.).

```
Your Laptop  ──── Internet ──── ❌ BLOCKED ──── AlloyDB (private IP)
```

### The Solution: A Bastion (Jump Host) VM

A small Compute Engine VM is created **inside** the same VPC as AlloyDB. This VM acts as a bridge:

```
Your Laptop
    │
    │  SSH (gcloud compute ssh)
    ▼
Bastion VM  (inside VPC)
    │
    │  psql / pg client → private IP of AlloyDB
    ▼
AlloyDB Cluster
```

**Step-by-step to use it:**

```bash
# 1. Start the VM (it's currently stopped)
gcloud compute instances start <your-vm-name> \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID

# 2. SSH into it
gcloud compute ssh <your-vm-name> \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID

# 3. From inside the VM, connect to AlloyDB
psql "postgresql://postgres:<PASSWORD>@<ALLOYDB_PRIVATE_IP>/cropmind"

# 4. Run migrations / DDL as needed

# 5. Exit the VM and STOP it again to save cost
exit
gcloud compute instances stop <your-vm-name> \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID
```

### Why Cloud Run Doesn't Need the VM

Cloud Run is configured with **Direct VPC Egress** (`--vpc-egress=private-ranges-only`). This places Cloud Run's network interface virtually *inside* the same private VPC, so it can reach AlloyDB's private IP address directly — no bastion needed for the running application.

```
Cloud Run  ──── Direct VPC Egress ──── ✅ ALLOWED ──── AlloyDB (private IP)
```

---

## 9. AlloyDB Schema & Seed Data

Full schema and seed data SQL: [`alloydb-setup.sql`](./alloydb-setup.sql)

### 9.1 Database Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;              -- pgvector for ANN search
CREATE EXTENSION IF NOT EXISTS google_ml_integration; -- AlloyDB ML integration
```

### 9.2 Tables

| Table | Columns | Records | Purpose |
|-------|---------|---------|---------|
| `crop_cases` | `case_id`, `crop_type`, `country`, `region`, `symptoms_text`, `diagnosis`, `treatment_applied`, `outcome_score`, `resolved_at`, `embedding vector(768)` | Dynamic | Vector-searchable past disease cases (RAG) |
| `crop_alerts` | `alert_id`, `crop_type`, `region`, `country`, `threat_type`, `threat_name`, `severity`, `description`, `advisory_text`, ... | 16 rows | Active APAC agricultural threat alerts |
| `market_prices` | `crop_type`, `country`, `market`, `price_per_kg`, `currency`, `price_usd_per_kg`, `week_of`, `price_change_7d/30d`, ... | 20 rows | Current APAC crop market prices |
| `subsidies` | `program_id`, `program_name`, `country`, `administered_by`, `description`, `eligible_crops`, `benefit_type`, `max_benefit_usd`, ... | 12 rows | Government support programs |
| `conversations` | `id`, `title`, `created_at` | Dynamic | User conversation history |
| `messages` | `id`, `conversation_id`, `role`, `content`, `created_at` | Dynamic | Chat messages per conversation |

### 9.3 Indexes

```sql
CREATE INDEX crop_cases_crop_type_idx ON crop_cases (crop_type);
CREATE INDEX crop_cases_country_idx ON crop_cases (country);
```

---

## 10. Current Database Status

> ⚠️ **Both AlloyDB and the Bastion VM are currently STOPPED to save Google Cloud credits.**

This means:
- **Cloud Run API:** Healthy (serves the React SPA). Database-dependent MCP tools will **fail fast in ≤10 seconds** (not hang) and agents will proceed with partial data.
- **You cannot** run manual `psql` sessions, schema migrations, or database administration until the VM is restarted.
- **Data is safe:** All data (vector embeddings, alerts, prices, subsidies) is persisted on disk. Nothing is lost by stopping.

**To resume full functionality:**
1. Start AlloyDB cluster (~5 min boot time) via Google Cloud Console → AlloyDB → Start
2. Start Bastion VM (if you need admin access) using commands in Section 8

### 10.1 Graceful Degradation (DB Down Behavior)

When AlloyDB is stopped, the system degrades gracefully instead of hanging:

| Component | DB Up | DB Down |
|-----------|-------|---------|
| Health check (`/api/healthz`) | `{"status":"ok","database":"connected"}` | `{"status":"ok","database":"disconnected"}` |
| WeatherTool (Open-Meteo API) | ✅ Works (~500ms) | ✅ Works (~500ms) |
| CropAlertTool (AlloyDB) | ✅ Works (~100ms) | ❌ Fails fast (~5s) |
| MarketPriceTool (AlloyDB) | ✅ Works (~100ms) | ❌ Fails fast (~5s) |
| SubsidyTool (AlloyDB) | ✅ Works (~100ms) | ❌ Fails fast (~5s) |
| CropDiseaseAgent | ✅ Full diagnosis | ✅ Full diagnosis (no DB needed) |
| WeatherAdaptationAgent | ✅ Weather + alerts | ⚠️ Weather only (alerts fail) |
| MarketSubsidyAgent | ✅ Prices + subsidies | ❌ Reports "data unavailable" |
| TreatmentProtocolAgent | ✅ Full protocol | ⚠️ Partial (missing market context) |
| **Final Synthesis** | ✅ Complete (~20s total) | ✅ **Still generates** (~30s total) |
| Vector search (`/api/cases/search`) | ✅ Works | ❌ Returns error |

**Timeout stack (defense in depth):**
```
Layer 1: pg Pool connectionTimeoutMillis = 5,000ms
Layer 2: MCP registry Promise.race timeout = 10,000ms
Layer 3: Cloud Run request timeout = 300,000ms
```

**Before fix:** 3 tools × 127s each = **~6 minutes** total → synthesis never loaded
**After fix:** 3 tools × 5s each = **~15 seconds** total → synthesis completes normally

---

## 11. Dockerfile & Build Pipeline

### 11.1 Multi-Stage Build

The project uses a **3-stage Docker build** (see [`Dockerfile`](./Dockerfile)):

```
Stage 1: base
  └─ node:24-slim + pnpm enabled

Stage 2: builder
  └─ Full source copy → pnpm install → build API (esbuild→CJS) + frontend (Vite→static)

Stage 3: runner (production)
  └─ node:24-slim (minimal)
  └─ Copy: dist/index.cjs (API bundle) + public/ (React SPA)
  └─ Install runtime deps: @google/adk@0.5.0, @modelcontextprotocol/sdk@1.27.1
  └─ Non-root user (cropmind:cropmind)
  └─ Healthcheck: HTTP GET /api/healthz every 30s
  └─ CMD: node dist/index.cjs
```

### 11.2 Runtime Dependencies (Not Bundled)

These are installed at Docker build time because esbuild cannot bundle them:

| Package | Version | Reason |
|---------|---------|--------|
| `@google/adk` | `0.5.0` | Google Agent Development Kit — dynamic requires |
| `@modelcontextprotocol/sdk` | `1.27.1` | MCP protocol — SSE transport internals |

### 11.3 Security

- Non-root user (`cropmind`) for the production container
- `express-rate-limit` on AI endpoints (5 req/min)
- CORS enabled (open for demo; restrict in production)
- Image upload limits: 10 MB max, only JPEG/PNG/WebP/GIF

---

## 12. Deployment Pipeline

### 12.1 Build a New Docker Image

```bash
# Builds the image and pushes it to Artifact Registry
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind/api:v<N> \
  --project=YOUR_PROJECT_ID \
  --machine-type=e2-highcpu-8
```

> Replace `<N>` with the next version number (currently at `v6`).

### 12.2 Deploy to Cloud Run

```bash
gcloud run deploy cropmind-api \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind/api:v<N> \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --max-instances=10 \
  --min-instances=0 \
  --timeout=300 \
  --network=default \
  --subnet=default \
  --vpc-egress=private-ranges-only \
  --set-env-vars="NODE_ENV=production,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1,GOOGLE_GENAI_USE_VERTEXAI=true" \
  --set-secrets="DATABASE_URL=cropmind-database-url:latest" \
  --project=YOUR_PROJECT_ID
```

### 12.3 View Logs

```bash
# Stream live logs
gcloud run services logs tail cropmind-api \
  --region=us-central1 \
  --project=YOUR_PROJECT_ID

# Read historical logs from a specific revision
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="cropmind-api"' \
  --project=YOUR_PROJECT_ID \
  --limit=50 \
  --format="value(textPayload)"
```

### 12.4 Revision History

| Tag | Revision | Status | Notes |
|---|---|---|---|
| `v1` | `cropmind-api-00001-xxx` | Replaced | Initial deploy |
| `v2` | `cropmind-api-00002-xxx` | Replaced | Iteration |
| `v3` | `cropmind-api-00003-xxx` | Replaced | Iteration |
| `v4` | `cropmind-api-00004-xxx` | Replaced | Failed — Express 5 wildcard routing bug |
| `v5` | `cropmind-api-00004-2q5` | Replaced | Failed — same wildcard bug, exit(1) |
| `v6` | `cropmind-api-00005-tpf` | ✅ **LIVE** | Fixed Express 5 wildcard routing |

---

## 13. Environment Variables & Secrets

### Environment Variables (set at deploy time)

| Variable | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Node environment |
| `GOOGLE_CLOUD_PROJECT` | `YOUR_PROJECT_ID` | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` | GCP region for AI services |
| `GOOGLE_GENAI_USE_VERTEXAI` | `true` | Forces SDK to use Vertex AI endpoint |
| `PORT` | `8080` | Injected automatically by Cloud Run |

### Secrets (injected from Secret Manager)

| Secret Name | Env Var | Description |
|---|---|---|
| `cropmind-database-url:latest` | `DATABASE_URL` | PostgreSQL connection string for AlloyDB |

---

## 14. Bug History & Fixes

### Bug: `TypeError: Missing parameter name at index 1: *` (v4 & v5)

**Root Cause:**

Express 5 upgraded its internal router to use `path-to-regexp` v8, which completely **removed support** for the legacy wildcard `*` syntax used in Express 4.

**Broken Code (Express 4 style):**

```typescript
// ❌ This crashes on Express 5 / path-to-regexp v8
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});
```

**Error thrown:**

```
Ks [TypeError]: Missing parameter name at index 1: *;
visit https://git.new/pathToRegexpError for info
  at Object.<anonymous> (/app/dist/index.cjs:335:2055)
```

**Fix Applied in v6:**

```typescript
// ✅ Express 5 compliant — middleware-style SPA catch-all
app.use((_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});
```

**File changed:** [`artifacts/api-server/src/app.ts`](./artifacts/api-server/src/app.ts)

---

### Warning: Deprecated Vertex AI SDK

The following deprecation warning appears in Cloud Run logs — it is **non-fatal** but should be addressed before June 2026:

```
The VertexAI class and all its dependencies are deprecated as of June 24, 2025
and will be removed on June 24, 2026.
Please use the Google Gen AI SDK (@google/genai).
```

**Action required:** Migrate any direct `VertexAI` class usage to the `@google/genai` package and ensure `GOOGLE_GENAI_USE_VERTEXAI=true` is set (already done) to route calls through Vertex AI's endpoint.

---

### Error: `PERMISSION_DENIED` on `gcloud run services describe`

**Cause:** The project ID was accidentally duplicated in an earlier command, creating the invalid project string `YOUR_PROJECT_IDYOUR_PROJECT_ID`. The correct project ID is simply `YOUR_PROJECT_ID`.

**Fix:** Always explicitly pass `--project=YOUR_PROJECT_ID` (single instance) in every `gcloud` command.

---

## 15. Known Issues & Next Steps

### 🔴 Immediate — Database Connectivity

- **AlloyDB cluster is stopped.** All database-dependent features (MCP tools, vector search, case submission) will fail until the cluster is restarted.
- **Bastion VM is stopped.** No schema migrations or manual DB access is possible until it's restarted.
- Confirm `DATABASE_URL` secret in Secret Manager points to the correct AlloyDB private IP.

### 🟡 Medium Priority — SDK Deprecation

- Migrate from deprecated `VertexAI` class to `@google/genai` SDK before **June 24, 2026**.
- Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk

### 🟡 Medium Priority — CI/CD Pipeline

- Currently, builds and deploys are run manually via `gcloud` CLI. Consider setting up **Cloud Build Triggers** connected to your Git repository for automated deployments.

### 🟢 Low Priority — Authentication

- The API is currently public (`--allow-unauthenticated`). For production, consider Cloud Run IAM, API keys, or JWT-based auth.

---

## 16. APAC Data Coverage

CropMind includes pre-seeded data covering the Asia-Pacific region for the Gen AI Academy APAC competition:

### 16.1 Countries (10)

India, Thailand, Philippines, Vietnam, Bangladesh, Indonesia, Pakistan, Malaysia, Australia, Japan

### 16.2 Crops (10+)

Rice, Wheat, Cotton, Tomato, Coffee, Palm Oil, Sugarcane, Banana, Coconut, Cassava

### 16.3 Crop Alerts (16 entries)

| ID | Crop | Country | Threat | Severity |
|----|------|---------|--------|----------|
| ALR-IN-001 | Rice | India (Punjab) | Bacterial Leaf Blight | High |
| ALR-IN-002 | Rice | India (West Bengal) | Brown Spot | Medium |
| ALR-IN-003 | Wheat | India (Punjab) | Yellow Rust | Critical |
| ALR-IN-004 | Tomato | India (Maharashtra) | Tomato Leaf Curl Virus | High |
| ALR-TH-001 | Rice | Thailand | Brown Planthopper | High |
| ALR-TH-002 | Cassava | Thailand | Sri Lankan Cassava Mosaic | Critical |
| ALR-PH-001 | Rice | Philippines | Rice Stem Borer | Medium |
| ALR-PH-002 | Banana | Philippines (Mindanao) | Fusarium Wilt TR4 | Critical |
| ALR-VN-001 | Coffee | Vietnam | Coffee Leaf Rust | High |
| ALR-VN-002 | Rice | Vietnam (Mekong Delta) | Rice Tungro Virus | High |
| ALR-BD-001 | Rice | Bangladesh | Yellow Stem Borer | Medium |
| ALR-ID-001 | Palm Oil | Indonesia | Rhinoceros Beetle | Medium |
| ALR-ID-002 | Palm Oil | Malaysia | Basal Stem Rot | High |
| ALR-PK-001 | Cotton | Pakistan | Cotton Leaf Curl Disease | Critical |
| ALR-AU-001 | Wheat | Australia | Stripe Rust | Medium |

### 16.4 Market Prices (20 entries)

Covers rice (7 markets), wheat (3), tomato, cotton (2), coffee, palm oil (2), sugarcane, banana, coconut — spanning India, Thailand, Vietnam, Philippines, Bangladesh, Japan, Indonesia, Pakistan, Australia, Malaysia.

### 16.5 Government Subsidies (12 programs)

PM-KISAN, PMFBY, SMAM (India), Rice Pledging Scheme, Smart Farmer Program (Thailand), RCEF, Sikat Saka (Philippines), Agricultural Modernization (Vietnam), Agriculture Subsidy Card (Bangladesh), Pupuk Subsidi (Indonesia), Punjab Agriculture Credit (Pakistan), Padi Price Subsidy (Malaysia), Farm Investment Fund (Australia), Direct Payment for Paddy (Japan).

---

## 17. Competition Context

| Field | Value |
|-------|-------|
| **Competition** | Gen AI Academy APAC |
| **Project** | CropMind — AI-powered agricultural advisory system |
| **Key GCP Products** | Vertex AI (Gemini 2.5 Pro/Flash), AlloyDB (pgvector), Cloud Run, Cloud Build, Secret Manager, Artifact Registry |
| **Differentiators** | Multi-agent orchestration with conflict resolution, Vector Search (RAG), MCP tool integration with SSE, real APAC agricultural data, image-based diagnosis, streaming responses |
| **Deadline** | ~6 days from March 26, 2026 |

---

## 18. Quick Reference Commands

```bash
# --- SERVICE STATUS ---
gcloud run services describe cropmind-api \
  --region=us-central1 \
  --project=YOUR_PROJECT_ID

# --- GET SERVICE URL ---
gcloud run services describe cropmind-api \
  --region=us-central1 \
  --project=YOUR_PROJECT_ID \
  --format="value(status.url)"

# --- LIST REVISIONS ---
gcloud run revisions list \
  --service=cropmind-api \
  --region=us-central1 \
  --project=YOUR_PROJECT_ID

# --- STREAM LIVE LOGS ---
gcloud run services logs tail cropmind-api \
  --region=us-central1 \
  --project=YOUR_PROJECT_ID

# --- START BASTION VM (for DB admin) ---
gcloud compute instances start <your-vm-name> \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID

# --- STOP BASTION VM (after work done) ---
gcloud compute instances stop <your-vm-name> \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID

# --- SSH INTO BASTION ---
gcloud compute ssh <your-vm-name> \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID

# --- TEST HEALTH CHECK ---
curl https://cropmind-api-16140643786.us-central1.run.app/api/healthz

# --- TEST DIAGNOSIS ---
curl -X POST https://cropmind-api-16140643786.us-central1.run.app/api/cropagent/diagnose \
  -H "Content-Type: application/json" \
  -d '{"query": "My rice plants in Punjab have brown spots on leaves"}'

# --- LIST SECRET VERSIONS ---
gcloud secrets versions list cropmind-database-url \
  --project=YOUR_PROJECT_ID

# --- UPDATE DATABASE URL SECRET ---
echo -n "postgresql://user:pass@<ALLOYDB_PRIVATE_IP>/cropmind" | \
  gcloud secrets versions add cropmind-database-url \
  --data-file=- \
  --project=YOUR_PROJECT_ID
```

---

*Last updated: March 26, 2026 — Revision v6 deployed and serving live traffic.*
