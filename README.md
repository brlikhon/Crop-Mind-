# CropMind - APAC Agricultural Intelligence Network

**Built with Google Agent Development Kit (ADK) + Vertex AI + MCP + Cloud Run**

> A multi-agent AI system for crop diagnosis serving smallholder farmers across APAC. Combines Google Vertex AI Gemini models, ADK agent orchestration, MCP tool servers, and pgvector intelligence for accurate, actionable agricultural recommendations.

## Competition Submission

- **Track**: Track 1 - Build and Deploy AI Agents using ADK
- **Live Demo**: _deployed on Cloud Run_
- **API Endpoint**: _deployed on Cloud Run_

## Problem Statement

Smallholder farmers in APAC face critical challenges:
- **Limited access** to agricultural extension services
- **Language barriers** preventing access to expert knowledge
- **Time-sensitive** crop disease decisions with high economic impact
- **Fragmented information** across weather, market, and treatment domains

## Solution Architecture

CropMind uses **Google ADK (Agent Development Kit)** to orchestrate 4 specialized AI agents, each executed via `InMemoryRunner` with proper session management. Agents call real-world data tools via `FunctionTool` bindings, with the same tools exposed as a standards-compliant **MCP server** for external clients.

```
┌─────────────────────────────────────────────────────────────┐
│              Farmer Query (Text + Optional Photo)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         ADK Orchestrator (InMemoryRunner + Gemini Pro)       │
│  • Parses query via ADK session                              │
│  • Routes to sub-agents via InMemoryRunner                   │
│  • Resolves conflicts between agents                         │
│  • Synthesizes final recommendation via ADK session          │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
         ▼               ▼               ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐
│   Disease   │  │   Weather   │  │  Market  │  │Treatment │
│    Agent    │  │    Agent    │  │  Agent   │  │  Agent   │
│ (ADK+Gemini)│  │ (ADK+Gemini)│  │(ADK+Gem.)│  │(ADK+Gem.)│
│             │  │ FunctionTool│  │ Function │  │          │
│  Multimodal │  │ get_weather │  │ Tool:    │  │Synthesizes│
│  (text+img) │  │ get_alerts  │  │ prices,  │  │all inputs│
└─────────────┘  └──────┬──────┘  │ subsidies│  └──────────┘
                        │         └────┬─────┘
                        │              │
                        ▼              ▼
              ┌─────────────────────────────┐
              │   MCP Server (SSE transport) │
              │  @modelcontextprotocol/sdk   │
              │  • get_weather (Open-Meteo)  │
              │  • get_crop_alerts (DB)      │
              │  • get_market_prices (DB)    │
              │  • get_subsidies (DB)        │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │      pgvector Intelligence   │
              │  (Vertex AI gemini-embedding │
              │   -001 + PostgreSQL pgvector) │
              │  • 550 historical cases      │
              │  • Semantic search           │
              │  • Outcome weighting         │
              └─────────────────────────────┘
```

## Google Cloud Services Used

### Core AI Services
- **Vertex AI Gemini 2.5 Flash** - Sub-agent reasoning (Disease, Weather, Market, Treatment)
- **Vertex AI Gemini 2.5 Pro** - Orchestrator query parsing and final synthesis
- **Vertex AI gemini-embedding-001** - Semantic similarity search (768-dim MRL vectors)

### Infrastructure
- **Cloud Run** - Serverless deployment for API and frontend
- **Cloud SQL PostgreSQL** - Database with pgvector extension
- **Secret Manager** - Secure credential storage
- **Cloud Build** - CI/CD pipeline

### Agent Development Kit (ADK)
- **`LlmAgent`** - Defines each specialized agent with model, instruction, and tools
- **`InMemoryRunner`** - Executes each agent through ADK's proper execution loop
- **`InMemorySessionService`** - Manages ADK sessions for each agent invocation
- **`FunctionTool`** - Binds real data tools (weather API, DB queries) to agents

### Model Context Protocol (MCP)
- **`@modelcontextprotocol/sdk`** - Standards-compliant MCP server
- **SSE Transport** - Real-time tool access for external MCP clients
- **4 Tool Endpoints** - Weather, Crop Alerts, Market Prices, Subsidies

### Key Features
- **Parallel Agent Execution** - Weather and Market agents run concurrently via ADK
- **Conflict Resolution Engine** - Handles disagreements between agents
- **Streaming Responses** - Real-time agent progress via Server-Sent Events
- **Multimodal Input** - Accepts crop photos alongside text descriptions
- **Vector Knowledge Base** - Learns from historical outcomes (pgvector)

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5
- **Language**: TypeScript
- **AI Framework**: Google ADK 0.5 (`@google/adk`)
- **MCP Server**: `@modelcontextprotocol/sdk`
- **Database**: PostgreSQL + pgvector
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Build**: esbuild (CJS bundle)

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS 4
- **Animation**: Framer Motion
- **State**: TanStack React Query
- **Routing**: Wouter

### Monorepo
- **Tool**: pnpm workspaces
- **Structure**: Composite TypeScript projects
- **Codegen**: Orval (OpenAPI → React Query + Zod)

## Project Structure

```
cropmind/
├── artifacts/
│   ├── api-server/          # Express API with ADK multi-agent system
│   │   ├── src/
│   │   │   ├── agents/      # 4 ADK agents + orchestrator (InMemoryRunner)
│   │   │   ├── mcp/         # MCP server + tool implementations
│   │   │   ├── vectors/     # Embedding + pgvector search
│   │   │   └── routes/      # API + MCP SSE endpoints
│   │   └── Dockerfile       # Cloud Run deployment
│   └── cropmind/            # React frontend dashboard
│       ├── src/
│       │   ├── pages/       # Diagnose + Architecture views
│       │   ├── components/  # Agent visualizer, results panel
│       │   └── hooks/       # API integration
│       └── Dockerfile       # Cloud Run deployment
├── lib/
│   ├── db/                  # Drizzle ORM schema + migrations
│   ├── api-spec/            # OpenAPI 3.1 specification
│   ├── api-zod/             # Generated Zod schemas
│   ├── api-client-react/    # Generated React Query hooks
│   └── integrations-google-vertex-ai-server/  # Vertex AI wrapper
├── cloudbuild.yaml          # Cloud Build CI/CD
└── README.md
```

## Quick Start

### Prerequisites
- Google Cloud account with billing enabled
- gcloud CLI installed
- Node.js 24+ and pnpm installed

### Local Development

```bash
# 1. Clone repository
git clone <repo-url>
cd cropmind

# 2. Install dependencies
pnpm install

# 3. Set up Google Cloud credentials
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# 4. Set up database
export DATABASE_URL=postgresql://user:password@localhost:5432/cropmind
pnpm --filter @workspace/db run push
npx tsx lib/db/seed-mcp.ts
npx tsx lib/db/seed-cases.ts

# 5. Run API server
pnpm --filter @workspace/api-server run dev

# 6. Run frontend (in another terminal)
pnpm --filter @workspace/cropmind run dev
```

### Deploy to Google Cloud

```bash
# Quick deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

## Example Queries

1. **Rice Disease**: "My rice plants in Punjab have brown spots on leaves and yellowing. Planted 6 weeks ago."
2. **Tomato Problem**: "Tomato plants in Maharashtra showing wilting despite watering. Stems have dark streaks."
3. **Market Query**: "Should I treat my wheat crop with rust or replant? Current market price?"

### What You'll See

- **Real-time agent execution** - Watch each ADK agent work via streaming
- **MCP tool calls** - See live calls to weather API, market DB, subsidy DB
- **Conflict resolution** - Observe how agents negotiate disagreements
- **Final recommendation** - Actionable, farmer-friendly advice
- **Similar cases** - Historical pgvector matches with treatment outcomes

## Impact Potential

### Target Users
- **500M+ smallholder farmers** across 10 APAC countries
- **Agricultural extension workers** needing decision support
- **NGOs and cooperatives** serving farming communities

### Scalability
- **Serverless architecture** - Auto-scales from 0 to 1000s of requests
- **Cost-effective** - ~$0.002 per diagnosis (Gemini Flash pricing)
- **Multi-language ready** - Gemini supports 100+ languages

## Technical Highlights

### 1. Proper ADK Agent Execution

Each agent is a real `LlmAgent` executed through ADK's `InMemoryRunner`, not a simple prompt wrapper:

```typescript
import { LlmAgent, FunctionTool, InMemoryRunner, InMemorySessionService } from "@google/adk";

const weatherAgent = new LlmAgent({
  name: "WeatherAdaptationAgent",
  model: "gemini-2.5-flash",
  instruction: SYSTEM_PROMPT,
  tools: [getWeatherTool, getCropAlertsTool],  // Real FunctionTool bindings
});

const runner = new InMemoryRunner(weatherAgent, { sessionService });

// Agent decides when to call tools — ADK handles the execution loop
const events = runner.runAsync({ userId, sessionId, newMessage: query });
for await (const event of events) { /* collect tool calls + final response */ }
```

### 2. Real MCP Server

Standards-compliant MCP server using `@modelcontextprotocol/sdk` with SSE transport:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "cropmind-agricultural-tools", version: "1.0.0" });

server.tool("get_weather", "Fetches weather for APAC regions", schema, async (params) => {
  const data = await fetchFromOpenMeteo(params);
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
// Accessible at /api/mcp/sse for any MCP client
```

### 3. Hybrid Vector Search

```typescript
// 60% semantic similarity + 40% treatment outcome
const weightedScore = similarityScore * 0.6 + outcomeScore * 0.4;

const results = await searchSimilarCases({
  symptomsDescription: query,
  cropType: "rice",
  country: "India",
  topK: 5,
});
```

## License

MIT License

## Acknowledgments

- **Google Cloud** for Vertex AI, ADK, and Cloud Run infrastructure
- **Open-Meteo** for free agricultural weather API
- **FAO** for crop disease reference data

---

**Built for Google Gen AI Academy APAC 2026** | Track 1: Build and Deploy AI Agents using ADK
