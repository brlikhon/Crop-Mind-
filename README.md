# 🌾 CropMind — APAC Agricultural Intelligence Platform

**Google Cloud Gen AI Academy APAC 2026**

CropMind is an enterprise-grade, multi-agent AI platform designed to help smallholder farmers across the Asia-Pacific region diagnose crop diseases, access treatment protocols, and make informed economic decisions. Built natively on Google Cloud using Vertex AI, the Agent Development Kit (ADK), and Cloud Run, it features an advanced, "Prisma Noir" inspired UI/UX.

> **Live URL:** https://cropmind-api-16140643786.us-central1.run.app/
> **GCP Project:** `YOUR_PROJECT_ID` | **Region:** `us-central1`

---

## 🌟 Key Capabilities & Technical Highlights

### 1. Multi-Agent Reasoning (Google ADK)
CropMind orchestrates 4 specialized AI agents working in tandem:
- **Disease Diagnostic Agent**: Analyzes symptoms (text/image) to identify the root cause, grounded via **Google Search** for verifiable research citations.
- **Weather & Climate Agent**: Evaluates real-time weather data to optimize treatment timing.
- **Market & Subsidy Agent**: Assesses the economic viability of treatments against current commodity prices and available government subsidies.
- **Treatment Synthesis Agent**: Resolves conflicts between the specialist agents and formulates a step-by-step, actionable field protocol.

### 2. Model Context Protocol (MCP) Integration
Instead of hardcoding APIs into the LLM, CropMind leverages the MCP protocol with SSE transport to provide tools to the agents:
- `WeatherTool`: Live Open-Meteo weather integrations.
- `CropAlertTool`: Real-world pest/disease outbreak alerts mapped to 9 APAC countries.
- `MarketPriceTool`: Real-world commodity prices for 20 crops.
- `SubsidyTool`: Actual government subsidy programs and application URLs.

### 3. pgvector Intelligence (PostgreSQL)
The application utilizes Cloud SQL (PostgreSQL 15) with the `pgvector` extension.
When an officer successfully resolves a case, the intelligence is embedded via `gemini-embedding-001` and stored. Future cases undergo a hybrid similarity search (combining cosine similarity with outcome quality scoring) to retrieve historical precedents.

### 4. Enterprise UI/UX ("Prisma Noir" Design System)
CropMind abandons standard component libraries in favor of a bespoke, high-performance UI:
- **Glassmorphism Components**: Deep, multi-layered translucency using backdrop blurs.
- **Micro-Animations**: Extensive use of `framer-motion` for staggered entrances, real-time agent reasoning streams, and seamless dashboard transitions.
- **Data-Dense Dashboards**: Professional command centers for agricultural officers, featuring impact scorecards, pgvector confidence gauges, and MCP tool execution logs.

---

## 🏗 Architecture

```mermaid
flowchart TB
    Client[React 19 Frontend<br>Tailwind, Framer Motion]
    
    subgraph Google Cloud Run
        API[Express 5 API Server]
        
        subgraph MultiAgent [Google ADK + Vertex AI]
            Orchestrator[Orchestrator<br>Gemini 2.5 Pro]
            Disease[Disease Agent<br>+ Google Search]
            Weather[Weather Agent<br>+ Open-Meteo API]
            Market[Market Agent<br>+ MCP Tools]
            Treatment[Treatment Agent<br>+ Google Search]
            Synthesis[Synthesis Agent<br>Conflict Resolution]
            
            Orchestrator -->|Parallel Spawn| Disease
            Orchestrator -->|Parallel Spawn| Weather
            Orchestrator -->|Parallel Spawn| Market
            
            Disease --> Treatment
            Weather --> Treatment
            Market --> Treatment
            
            Treatment --> Synthesis
            Synthesis -->|Final Protocol| Orchestrator
        end
        
        API <-->|SSE Stream| Orchestrator
    end
    
    subgraph CloudSQL [Cloud SQL - PostgreSQL 15]
        PGVector[(pgvector<br>Case Embeddings)]
    end
    
    Client <-->|REST & SSE| API
    API <-->|Vector Search| PGVector
```

## 🗺️ Diagnostic Workflow

```mermaid
sequenceDiagram
    participant F as Farmer
    participant UI as React Frontend
    participant O as Orchestrator
    participant S as Specialist Agents
    participant M as MCP Tools
    participant DB as Cloud SQL

    F->>UI: Submits symptoms & region
    UI->>O: Start Diagnostic Stream (SSE)
    
    par Vector Search
        O->>DB: Query historical similar cases
        DB-->>O: Return top matches & confidence
    and Agent Analysis
        O->>S: Spawn Disease, Weather, Market agents
        S->>M: Fetch live weather, prices, subsidies
        M-->>S: Return real-world data
        S-->>O: Return specialist findings
    end
    
    O->>S: Spawn Treatment & Synthesis agents
    S-->>O: Return unified action plan
    
    O-->>UI: Stream complete recommendation
    UI-->>F: Display dashboard & actionable protocol
```

---

## 🛠️ Technologies Used

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | Node.js | v24 |
| **Framework** | Express | v5 |
| **Language** | TypeScript | 5.9 |
| **Frontend** | React 19 + Tailwind + Framer Motion | — |
| **Build** | Vite (frontend) + esbuild (API) | — |
| **Package Manager** | pnpm (monorepo) | v10 |
| **AI Models** | Gemini 2.5 Pro (orchestrator), Gemini 2.5 Flash (agents) | — |
| **Embeddings** | gemini-embedding-001 (768-dim, MRL) | — |
| **Agent Framework** | @google/adk | 0.5.0 |
| **MCP Protocol** | @modelcontextprotocol/sdk (SSE transport) | 1.27.1 |
| **Database** | Cloud SQL PostgreSQL 15 + pgvector | — |
| **ORM** | Drizzle ORM | — |
| **Hosting** | Google Cloud Run (serverless) | — |
| **CI/CD** | Google Cloud Build | — |
| **Container** | Docker (multi-stage, non-root) | — |
| **Secrets** | Google Secret Manager | — |

---

## 🚀 Complete Setup & Deployment Guide

### Prerequisites

- **Node.js 24+** and **pnpm 10+**
- **Google Cloud SDK** (`gcloud`) installed and authenticated
- A **Google Cloud Project** with billing enabled
- The following APIs enabled:
  ```bash
  gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    aiplatform.googleapis.com \
    --project=YOUR_PROJECT_ID
  ```

---

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/brlikhon/CropMind.git
cd CropMind

# Install all workspace dependencies
pnpm install
```

---

### Step 2: Create Cloud SQL Instance

```bash
# Create a PostgreSQL 15 instance
gcloud sql instances create cropmind-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-size=10GB \
  --storage-type=SSD \
  --authorized-networks=0.0.0.0/0 \
  --project=YOUR_PROJECT_ID

# Set the postgres password
gcloud sql users set-password postgres \
  --instance=cropmind-db \
  --password=YOUR_SECURE_PASSWORD \
  --project=YOUR_PROJECT_ID

# Create a dedicated user for the app
gcloud sql users create crop_admin \
  --instance=cropmind-db \
  --password=YOUR_APP_PASSWORD \
  --project=YOUR_PROJECT_ID

# Create the database
gcloud sql databases create cropmind \
  --instance=cropmind-db \
  --project=YOUR_PROJECT_ID
```

---

### Step 3: Get the Database IP

```bash
# Get the public IP of the Cloud SQL instance
gcloud sql instances describe cropmind-db \
  --format="value(ipAddresses[0].ipAddress)" \
  --project=YOUR_PROJECT_ID
```

---

### Step 4: Enable pgvector Extension

```bash
# Connect to the database and enable pgvector
gcloud sql connect cropmind-db --user=postgres --project=YOUR_PROJECT_ID

# In the psql shell, run:
# CREATE EXTENSION IF NOT EXISTS vector;
# \q

# Or use the provided script:
node lib/db/enable_vector.cjs
```

---

### Step 5: Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=true

# Database Configuration
DATABASE_URL=postgresql://crop_admin:YOUR_APP_PASSWORD@CLOUD_SQL_IP:5432/cropmind

# Embedding Configuration
EMBEDDING_STRICT_AI=false

# Server Configuration
PORT=8080
NODE_ENV=development
```

---

### Step 6: Push Database Schema (Drizzle)

```bash
# Push the schema to Cloud SQL using Drizzle
cd lib/db
npx drizzle-kit push
cd ../..
```

This creates all the tables:
- `crop_cases` — pgvector embeddings (768-dim) for RAG
- `crop_alerts` — APAC pest/disease outbreak alerts
- `market_prices` — Commodity prices for 20 crops
- `subsidies` — Government subsidy programs
- `conversations` — User chat history
- `messages` — Chat messages per conversation

---

### Step 7: Seed the Database

```bash
# Connect to Cloud SQL and run the seed script
gcloud sql connect cropmind-db --user=crop_admin --database=cropmind --project=YOUR_PROJECT_ID

# In the psql shell, paste the contents of alloydb-setup.sql
# (This seeds 16 crop alerts, 20 market prices, and 14 subsidy programs)
# \q
```

Or if you have direct access:

```bash
psql "postgresql://crop_admin:YOUR_APP_PASSWORD@CLOUD_SQL_IP:5432/cropmind" \
  -f alloydb-setup.sql
```

---

### Step 8: Run Locally

```bash
# Start the development server (API + Frontend)
pnpm dev

# The app will be available at http://localhost:8080
```

---

### Step 9: Build the Docker Image

**Option A — Using Cloud Build (recommended):**

```bash
# Single command: builds + pushes to Container Registry
gcloud builds submit \
  --config cloudbuild.yaml \
  --project=YOUR_PROJECT_ID
```

This runs all 4 steps defined in `cloudbuild.yaml`:
1. Builds the Docker image (multi-stage: base → builder → runner)
2. Pushes image to Container Registry (`gcr.io/PROJECT_ID/cropmind-api`)
3. Tags as `:latest`
4. Deploys to Cloud Run with all environment variables

**Option B — Manual build + deploy (step by step):**

```bash
# Build locally and push to Artifact Registry
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind/api:v1 \
  --project=YOUR_PROJECT_ID \
  --machine-type=e2-highcpu-8
```

---

### Step 10: Store DATABASE_URL in Secret Manager

```bash
# Create the secret
echo -n "postgresql://crop_admin:YOUR_APP_PASSWORD@CLOUD_SQL_IP:5432/cropmind" | \
  gcloud secrets create cropmind-database-url \
  --data-file=- \
  --replication-policy="automatic" \
  --project=YOUR_PROJECT_ID

# Grant Cloud Run access to read the secret
gcloud secrets add-iam-policy-binding cropmind-database-url \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID
```

---

### Step 11: Deploy to Cloud Run

**Option A — Via cloudbuild.yaml (already done in Step 9A):**

`cloudbuild.yaml` handles the deployment automatically.

**Option B — Manual deploy:**

```bash
gcloud run deploy cropmind-api \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cropmind/api:v1 \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --max-instances=10 \
  --min-instances=0 \
  --timeout=300 \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:cropmind-db \
  --set-env-vars="NODE_ENV=production,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1,GOOGLE_GENAI_USE_VERTEXAI=true" \
  --set-secrets="DATABASE_URL=cropmind-database-url:latest" \
  --project=YOUR_PROJECT_ID
```

---

### Step 12: Make the Service Public

```bash
gcloud run services add-iam-policy-binding cropmind-api \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=YOUR_PROJECT_ID
```

---

### Step 13: Verify Deployment

```bash
# Get the service URL
gcloud run services describe cropmind-api \
  --region=us-central1 \
  --project=YOUR_PROJECT_ID \
  --format="value(status.url)"

# Test the health endpoint
curl https://YOUR_CLOUD_RUN_URL/api/healthz
# Expected: {"status":"ok","database":"connected","timestamp":"..."}

# Test a diagnosis
curl -X POST https://YOUR_CLOUD_RUN_URL/api/cropagent/diagnose \
  -H "Content-Type: application/json" \
  -d '{"query": "My rice leaves are yellowing with brown spots in Punjab, India"}'
```

---

## 📊 API Endpoints

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| `GET` | `/api/healthz` | Health check + DB status | None |
| `POST` | `/api/cropagent/diagnose` | Full multi-agent diagnosis | 5 req/min |
| `POST` | `/api/cropagent/diagnose/stream` | Streaming diagnosis (SSE) | 5 req/min |
| `POST` | `/api/cases/search` | pgvector similarity search | None |
| `POST` | `/api/cases/submit` | Submit new crop case | None |
| `GET` | `/api/mcp/sse` | Open MCP SSE session | None |
| `POST` | `/api/mcp/messages` | Send MCP message | None |
| `GET` | `/api/mcp/tools` | List all MCP tools | None |
| `POST` | `/api/mcp/call` | Invoke MCP tool directly | None |
| `GET` | `/*` | React SPA (static files) | None |

---

## 🔧 Useful Commands Reference

```bash
# ──── Cloud SQL ────
# List instances
gcloud sql instances list --project=YOUR_PROJECT_ID

# Connect via psql
gcloud sql connect cropmind-db --user=crop_admin --database=cropmind

# Describe instance (get IP, status)
gcloud sql instances describe cropmind-db --project=YOUR_PROJECT_ID

# ──── Cloud Run ────
# List revisions
gcloud run revisions list --service=cropmind-api --region=us-central1

# Stream live logs
gcloud run services logs tail cropmind-api --region=us-central1

# Read historical logs
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="cropmind-api"' \
  --project=YOUR_PROJECT_ID --limit=50 --format="value(textPayload)"

# Describe service
gcloud run services describe cropmind-api --region=us-central1

# ──── Secret Manager ────
# List secret versions
gcloud secrets versions list cropmind-database-url --project=YOUR_PROJECT_ID

# Update database URL secret
echo -n "postgresql://user:pass@IP:5432/cropmind" | \
  gcloud secrets versions add cropmind-database-url --data-file=- --project=YOUR_PROJECT_ID

# ──── Cloud Build ────
# List recent builds
gcloud builds list --limit=5 --project=YOUR_PROJECT_ID

# Rebuild and redeploy
gcloud builds submit --config cloudbuild.yaml --project=YOUR_PROJECT_ID

# ──── Local Development ────
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Push schema changes
cd lib/db && npx drizzle-kit push
```

---

## 📁 Project Structure

```
CropMind/
├── artifacts/
│   ├── api-server/          # Express 5 API server
│   │   └── src/
│   │       ├── agents/      # Multi-agent orchestrator + 4 specialist agents
│   │       ├── mcp/         # MCP tool registry + 4 tools + SSE server
│   │       ├── routes/      # API routes (healthz, cropagent, cases, mcp)
│   │       └── vectors/     # pgvector embedding + search pipeline
│   └── cropmind/            # React 19 frontend (Prisma Noir UI)
├── lib/
│   ├── db/                  # Drizzle ORM schema + pool config
│   └── api-zod/             # Shared Zod validation schemas
├── cloudbuild.yaml          # Cloud Build CI/CD pipeline
├── Dockerfile               # Multi-stage Docker build (3 stages)
├── alloydb-setup.sql        # Seed data (alerts, prices, subsidies)
└── pnpm-workspace.yaml      # Monorepo workspace config
```

---

## 🔒 Security Notice
**No credentials, API keys, or database connection strings are stored in this repository.**
All configurations must be supplied locally via a `.env` file (which is ignored by Git) or securely via Google Cloud Secret Manager in production.

---

## 🌏 APAC Data Coverage

- **10 Countries**: India, Thailand, Philippines, Vietnam, Bangladesh, Indonesia, Pakistan, Malaysia, Australia, Japan
- **10+ Crops**: Rice, Wheat, Cotton, Tomato, Coffee, Palm Oil, Sugarcane, Banana, Coconut, Cassava
- **16 Threat Alerts**: Real pest/disease outbreaks with severity ratings
- **20 Market Prices**: Live commodity pricing across APAC markets
- **14 Subsidy Programs**: Government support programs with application URLs

---

**CropMind - Built for real-world impact. Designed to scale.**
