# CropMind — Live Infrastructure & Deployment Details

> **Live URL:** https://cropmind-api-16140643786.us-central1.run.app/
> **Project ID:** `YOUR_PROJECT_ID`
> **Region:** `us-central1`
> **Last Deployed:** March 26, 2026 — Revision `cropmind-api-00005-tpf` (Image tag `v6`)

---

## Architecture Overview

```
┌──────────────┐       HTTPS        ┌──────────────────────────────┐
│   End User   │ ──────────────────▶ │   Google Cloud Run           │
│   (Browser)  │                     │   cropmind-api               │
└──────────────┘                     │   ┌──────────────────────┐   │
                                     │   │  Express 5 API       │   │
                                     │   │  ├── /api/cropagent   │   │
                                     │   │  ├── /api/mcp         │   │
                                     │   │  ├── /api/cases       │   │
                                     │   │  └── SPA (React)      │   │
                                     │   └──────────────────────┘   │
                                     │          │           │       │
                                     └──────────┼───────────┼───────┘
                                                │           │
                                     ┌──────────▼──┐  ┌─────▼──────────────┐
                                     │  Vertex AI   │  │  AlloyDB (Private) │
                                     │  Gemini 2.5  │  │  pgvector (768d)   │
                                     │  Flash/Pro   │  │  ┌────────────────┐│
                                     │              │  │  │ crop_cases     ││
                                     │  Embeddings: │  │  │ crop_alerts    ││
                                     │  gemini-     │  │  │ market_prices  ││
                                     │  embedding-  │  │  │ subsidies      ││
                                     │  001         │  │  │ conversations  ││
                                     └─────────────┘  │  └────────────────┘│
                                                       └───────────────────┘
                                                            ▲
                                                            │ Private IP Only
                                                            │ (no public access)
                                                       ┌────┴───────────────┐
                                                       │  Jump-Host VM      │
                                                       │  (Compute Engine)  │
                                                       │  psql client       │
                                                       │  ⚠️ STOPPED        │
                                                       └────────────────────┘
```

---

## Google Cloud Services Used

| Service | Resource | Purpose | Status |
|---------|----------|---------|--------|
| **Cloud Run** | `cropmind-api` | Hosts Express 5 API + React SPA | ✅ Running |
| **Vertex AI** | Gemini 2.5 Flash/Pro | Multi-agent AI reasoning (Orchestrator uses 2.5 Pro, specialist agents use 2.5 Flash) | ✅ Active |
| **Vertex AI** | `gemini-embedding-001` | 768-dimensional vector embeddings for RAG (MRL) | ✅ Active |
| **AlloyDB** | PostgreSQL 15 + pgvector | Vector search, crop cases, alerts, market data, subsidies | ⏸️ Stopped (cost saving) |
| **Artifact Registry** | `us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind` | Docker image repository | ✅ Active |
| **Secret Manager** | `cropmind-database-url` | DATABASE_URL secret for Cloud Run | ✅ Active |
| **Cloud Build** | On-demand | Docker image builds (e2-highcpu-8) | ✅ On-demand |
| **Compute Engine** | Jump-Host VM | Bastion host for AlloyDB admin access | ⏸️ Stopped (cost saving) |
| **VPC** | `default` network | Private networking for AlloyDB connectivity | ✅ Active |

---

## Why AlloyDB Needs a VM (Jump-Host / Bastion Host)

AlloyDB is **Private by Design** — it does not have and cannot be assigned a public IP address. It exists only inside the Google Cloud VPC private network.

### The Problem

```
Your Laptop (Public Internet) ──✘──▶ AlloyDB (Private IP: 10.x.x.x)
                                      ❌ Connection refused — no public endpoint
```

### The Solution: Jump-Host VM

```
Your Laptop ──SSH──▶ Compute Engine VM ──psql──▶ AlloyDB (10.x.x.x)
                     (same VPC network)           ✅ Connected!
                     Has psql client
```

1. **The VM acts as a bridge.** It sits inside the same VPC as AlloyDB, so it can reach AlloyDB's private IP.
2. **You SSH into the VM** from your laptop over the public internet.
3. **From the VM, you run `psql`** to connect to AlloyDB and run schema migrations, seed data, enable extensions, etc.

### Why Cloud Run Works Without a VM

Cloud Run connects to AlloyDB because we configured **Direct VPC Egress** (`--vpc-egress=private-ranges-only`), which places Cloud Run inside the same private network at runtime. No bastion host needed for the application — only for **manual database administration**.

### Current Status

> ⚠️ **Both the AlloyDB cluster and the Jump-Host VM have been stopped** to conserve Google Cloud credits. The database and all its data (vector embeddings, alerts, market prices, subsidies) are safely persisted on disk. Restarting takes ~5 minutes.

> **Graceful Degradation:** When AlloyDB is stopped, the app does NOT hang. MCP tools fail fast in ≤10 seconds (via pool timeout + tool-level timeout), agents proceed with partial data, and the final synthesis **still generates** a recommendation using whatever data is available. Only weather (which uses Open-Meteo API, no DB) works fully. Disease diagnosis also works fully since it doesn't require the database.

---

## Multi-Agent AI System (Vertex AI)

CropMind uses a **custom multi-agent orchestration** pattern powered by Gemini 2.5 Flash/Pro via Vertex AI:

| Agent | Model | File | Responsibility |
|-------|-------|------|----------------|
| **Orchestrator** | gemini-2.5-pro | `orchestrator.ts` | Routes user queries to specialist agents, merges responses |
| **Crop Disease Agent** | gemini-2.5-flash | `crop-disease-agent.ts` | Diagnoses plant diseases from symptoms or images |
| **Treatment Agent** | gemini-2.5-flash | `treatment-agent.ts` | Recommends treatment plans and products |
| **Market Agent** | gemini-2.5-flash | `market-agent.ts` | Provides market prices, trends, and trade intelligence |
| **Weather Agent** | gemini-2.5-flash | `weather-agent.ts` | Weather forecasts and agricultural impact analysis |

> **Note:** This is a custom multi-agent system built from scratch, NOT using the official Google ADK framework. The orchestrator uses sequential API calls to coordinate specialist agents.

### MCP Tools (Model Context Protocol)

| Tool | File | Data Source |
|------|------|-------------|
| **Crop Alert Tool** | `crop-alert-tool.ts` | AlloyDB `crop_alerts` table (16 APAC alerts) |
| **Market Price Tool** | `market-price-tool.ts` | AlloyDB `market_prices` table (20 APAC markets) |
| **Subsidy Tool** | `subsidy-tool.ts` | AlloyDB `subsidies` table (12 APAC programs) |
| **Weather Tool** | `weather-tool.ts` | External weather API integration |

### Vector Search (RAG)

- **Table:** `crop_cases` with `vector(768)` column
- **Embedding Model:** Vertex AI `gemini-embedding-001` (MRL with 768 dimensions)
- **Distance Function:** Cosine similarity (`<=>` operator)
- **Ranking:** Weighted score = 60% similarity + 40% outcome score
- **Search flow:** User symptoms → embedding → pgvector ANN search → top-K results → context for agents
- **Current Status:** ⚠️ Database is stopped. No crop cases seeded yet. Vector search will be available after database restart and seeding.

---

## Cloud Run Deployment Details

### Environment Variables

```
NODE_ENV=production
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=true
PORT=8080 (injected by Cloud Run)
```

### Secrets

```
DATABASE_URL → Secret Manager: cropmind-database-url:latest
```

### Resource Configuration

```
Memory:         1 GiB
CPU:            1 vCPU
Max Instances:  10
Min Instances:  0 (scales to zero)
Timeout:        300s
VPC Egress:     private-ranges-only (Direct VPC Egress)
Network:        default
Subnet:         default
Auth:           Allow unauthenticated
```

### Build & Deploy Commands

```bash
# Build Docker image (Cloud Build)
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind/api:v6 \
  --project=YOUR_PROJECT_ID \
  --machine-type=e2-highcpu-8

# Deploy to Cloud Run
gcloud run deploy cropmind-api \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind/api:v6 \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi --cpu=1 \
  --max-instances=10 --min-instances=0 \
  --timeout=300 \
  --network=default --subnet=default \
  --vpc-egress=private-ranges-only \
  --set-env-vars="NODE_ENV=production,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1,GOOGLE_GENAI_USE_VERTEXAI=true" \
  --set-secrets="DATABASE_URL=cropmind-database-url:latest" \
  --project=YOUR_PROJECT_ID
```

---

## AlloyDB Setup

### Database Tables

| Table | Records | Description |
|-------|---------|-------------|
| `crop_cases` | 0 (not seeded yet) | Vector-searchable past crop disease cases with 768-dim embeddings |
| `crop_alerts` | 16 rows | Active APAC agricultural threat alerts |
| `market_prices` | 20 rows | Current APAC crop market prices |
| `subsidies` | 14 rows | Government support programs across APAC |
| `conversations` | Dynamic | User conversation history |
| `messages` | Dynamic | Chat messages per conversation |

> **Note:** The `crop_cases` table schema exists but has not been seeded with vector data yet. The MCP tool tables (`crop_alerts`, `market_prices`, `subsidies`) are fully seeded with APAC data.

### Extensions Enabled

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS google_ml_integration;
```

### Schema Setup

Full schema and seed data: [`alloydb-setup.sql`](./alloydb-setup.sql)

### Restarting AlloyDB (When Needed)

1. Go to **Google Cloud Console → AlloyDB**
2. Select your cluster → Click **Start**
3. Wait ~5 minutes for the instance to become ready
4. The Cloud Run API will automatically reconnect

---

## Security & Production Readiness

### Strict AI Mode (No Silent Failures)

The embedding system defaults to `STRICT_AI_MODE=true`, which means:
- If Vertex AI credentials are missing or invalid, the system throws a 500 error
- No silent fallback to deterministic hash embeddings
- Judges and users see clear error messages instead of receiving garbage AI responses
- Set `EMBEDDING_STRICT_AI=false` only for local development without GCP credentials

### Rate Limiting

- Diagnose endpoints limited to 5 requests per minute per IP address
- Prevents abuse and manages Vertex AI API costs
- Returns HTTP 429 with clear error message when limit exceeded

### Express 5 Compatibility Fix

Express 5 (used in this project) upgraded `path-to-regexp` to v8, which removed support for bare `*` wildcards. The SPA catch-all route was updated:

```diff
- app.get("*", (_req, res) => {
+ app.use((_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
```

This fix was deployed in image tag `v6` (revision `cropmind-api-00005-tpf`).

---

## API Endpoints

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| GET | `/api/healthz` | Health check | None |
| POST | `/api/cropagent/diagnose` | AI-powered crop diagnosis | 5 req/min per IP |
| POST | `/api/cropagent/diagnose/stream` | Streaming diagnosis (SSE) | 5 req/min per IP |
| GET | `/api/cases/search` | Vector similarity search | None |
| POST | `/api/cases/submit` | Submit new crop case | None |
| POST | `/api/mcp/tools/:toolName` | Invoke MCP tools | None |
| GET | `/*` | React SPA (static files) | None |

> **Rate Limiting:** The diagnose endpoints are protected with `express-rate-limit` to prevent abuse and manage Vertex AI costs.

---

## APAC Data Coverage

CropMind includes pre-seeded data covering the Asia-Pacific region:

- **Countries:** India, Thailand, Philippines, Vietnam, Bangladesh, Indonesia, Pakistan, Malaysia, Australia, Japan
- **Crops:** Rice, Wheat, Cotton, Tomato, Coffee, Palm Oil, Sugarcane, Banana, Coconut, Cassava
- **Threats:** Bacterial Leaf Blight, Yellow Rust, Brown Planthopper, Fusarium TR4, Coffee Leaf Rust, CLCuD, and more
- **Subsidies:** PM-KISAN, PMFBY, RCEF, Rice Pledging Scheme, and 8 more government programs

---

## Cost Management

| Resource | Running Cost | Stopped Cost |
|----------|-------------|-------------|
| Cloud Run | ~$0 (scales to zero) | $0 |
| AlloyDB | ~$1.50/day | ~$0.10/day (storage only) |
| Jump-Host VM | ~$0.50/day (e2-micro) | $0 |
| Vertex AI | Pay per request | $0 |

> **Tip:** Stop AlloyDB and the VM when not testing. Start them ~5 minutes before recording demos or running tests.

---

## Competition Context

- **Competition:** Gen AI Academy APAC
- **Project:** CropMind — AI-powered agricultural advisory system
- **Key GCP Products:** Vertex AI (Gemini 2.5 Flash/Pro), AlloyDB (pgvector), Cloud Run, Cloud Build, Secret Manager
- **Architecture:** Custom multi-agent orchestration (NOT using official Google ADK framework)
- **Differentiators:** Multi-agent coordination, Vector Search (RAG), MCP tool integration, real APAC agricultural data
- **Deployment Status:** ✅ Live on Cloud Run with Direct VPC Egress to AlloyDB
