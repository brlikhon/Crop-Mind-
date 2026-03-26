import { motion } from "framer-motion";
import { Database, Bot, BrainCircuit, MessageSquare, ShieldCheck, Server, Cloud, Cpu, CheckCircle2, TrendingUp, Rocket, BookOpen, Terminal, GitBranch } from "lucide-react";

export default function ArchitecturePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-24">
      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Architecture Deep Dive</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          How CropMind combines Agentic Orchestration, Real-world Context, and Vector Intelligence to serve smallholder farmers.
        </p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="bg-card border rounded-3xl p-8 shadow-xl mb-16"
      >
        <div className="flex flex-col items-center relative">
          
          <motion.div variants={itemVariants} className="w-full max-w-md bg-background border rounded-xl p-4 flex items-center gap-4 shadow-sm z-10">
            <div className="bg-primary/10 p-3 rounded-lg text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">1. Farmer Input</h3>
              <p className="text-xs text-muted-foreground">Natural language unstructured query via SMS/Web</p>
            </div>
          </motion.div>

          <div className="h-8 w-px bg-border my-2"></div>

          <motion.div variants={itemVariants} className="w-full bg-gradient-to-br from-primary to-primary/80 border-primary rounded-xl p-6 flex flex-col items-center shadow-lg shadow-primary/20 z-10 text-primary-foreground relative">
            <BrainCircuit className="w-10 h-10 mb-3" />
            <h3 className="font-bold text-lg mb-1">2. Vertex AI Orchestrator</h3>
            <p className="text-sm text-primary-foreground/80 text-center max-w-md">
              Parses intent, conditionally routes to sub-agents, resolves conflicting advice (e.g. moisture vs fungal risk), synthesizes final output using Gemini 2.5 Pro.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8">
              {['Disease Agent', 'Weather Agent', 'Market Agent', 'Treatment Agent'].map((agent, i) => (
                <div key={i} className="bg-black/20 backdrop-blur-md rounded-lg p-3 text-center border border-white/10">
                  <Bot className="w-5 h-5 mx-auto mb-2 opacity-80" />
                  <span className="text-xs font-bold">{agent}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex w-full max-w-2xl justify-around my-4">
             <div className="h-12 w-px bg-border/80 relative before:absolute before:w-2 before:h-2 before:bg-border before:-bottom-1 before:-left-[3.5px] before:rounded-full"></div>
             <div className="h-12 w-px bg-border/80 relative before:absolute before:w-2 before:h-2 before:bg-border before:-bottom-1 before:-left-[3.5px] before:rounded-full"></div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 w-full z-10">
            
            <motion.div variants={itemVariants} className="flex-1 bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 border-b pb-4">
                <div className="bg-secondary/15 p-2 rounded-lg text-secondary">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">3a. MCP Tool Servers</h3>
                  <p className="text-xs text-muted-foreground">Real-time external grounding</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Cloud className="w-4 h-4 text-muted-foreground"/> Open-Meteo Weather API</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-muted-foreground"/> Gov Crop Alerts DB</li>
                <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground"/> APAC Market Prices DB</li>
                <li className="flex items-center gap-2"><Database className="w-4 h-4 text-muted-foreground"/> Subsidy Registry DB</li>
              </ul>
            </motion.div>

            <motion.div variants={itemVariants} className="flex-1 bg-card border rounded-xl p-6 shadow-sm border-t-4 border-t-accent-foreground">
              <div className="flex items-center gap-3 mb-4 border-b pb-4">
                <div className="bg-accent text-accent-foreground p-2 rounded-lg">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">3b. AlloyDB Vector Store</h3>
                  <p className="text-xs text-muted-foreground">Historical Case Intelligence</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                pgvector extension enables cosine similarity search over 550+ historical farmer cases across 10 APAC countries.
              </p>
              <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground">
                ORDER BY embedding &lt;=&gt; query_vector<br/>
                LIMIT 5
              </div>
            </motion.div>

          </div>

          <div className="h-10 w-px bg-border my-4"></div>

          <motion.div variants={itemVariants} className="w-full max-w-lg bg-background border-2 border-primary/20 rounded-xl p-5 flex items-center gap-4 shadow-md z-10">
            <div className="bg-success/20 p-3 rounded-full text-success shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">4. Unified Recommendation</h3>
              <p className="text-sm text-muted-foreground">Synthesized, context-aware, historically-backed advice delivered to farmer.</p>
            </div>
          </motion.div>

        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
      >
        <div>
          <h2 className="text-2xl font-bold mb-4 text-foreground">The Problem</h2>
          <p className="text-muted-foreground leading-relaxed">
            Over 500 million smallholder farmers in the APAC region produce 80% of the food supply, yet they lack access to real-time, expert agronomic advice. When disease strikes, delayed or incorrect treatments lead to devastating yield losses. Traditional AI chatbots lack the specific local context, weather constraints, and economic reality required to give safe, actionable farming advice.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4 text-foreground">The Google Cloud Solution</h2>
          <p className="text-muted-foreground leading-relaxed">
            CropMind solves this by combining three cutting-edge tracks:
          </p>
          <ul className="mt-4 space-y-3">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
              <span className="text-sm text-foreground"><strong className="text-primary">Multi-Agent Orchestration:</strong> A custom multi-agent framework built on Vertex AI that breaks complex agronomic reasoning into specialized roles (disease, weather, market, treatment) and resolves conflicts automatically.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2"></div>
              <span className="text-sm text-foreground"><strong className="text-secondary">MCP Tool Servers:</strong> Secure execution boundaries that give agents live read-access to external APIs (Open-Meteo) and internal PostgreSQL databases for real-time grounding.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground mt-2"></div>
              <span className="text-sm text-foreground"><strong className="text-accent-foreground">AlloyDB Vector Intelligence:</strong> Utilizing pgvector to perform semantic similarity searches against a knowledge base of past successful treatments across 10 APAC countries.</span>
            </li>
          </ul>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-card border rounded-2xl p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Rocket className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Deployment Architecture</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          CropMind is designed for production deployment on Google Cloud, scaling to serve 500M+ farmers across APAC.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-xl p-5 bg-background/50">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-sm">Cloud Run</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Containerized API server with auto-scaling. The Express backend and multi-agent orchestrator run as a single Cloud Run service with concurrency tuned for LLM call latency. The React frontend is served as static assets via Cloud CDN.
            </p>
          </div>
          <div className="border rounded-xl p-5 bg-background/50">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-secondary" />
              <h4 className="font-bold text-sm">AlloyDB for PostgreSQL</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fully managed PostgreSQL-compatible database with pgvector for vector similarity search. Stores MCP tool data (alerts, prices, subsidies) and the 550+ historical case embeddings. Supports cross-region read replicas for APAC-wide low latency.
            </p>
          </div>
          <div className="border rounded-xl p-5 bg-background/50">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="w-5 h-5 text-accent-foreground" />
              <h4 className="font-bold text-sm">Vertex AI + Gemini</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Production deployment targets Vertex AI with Gemini models for agent reasoning and text-embedding-005 for case vectorization. The modular agent architecture allows swapping model providers without changing orchestration logic.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-card border rounded-2xl p-8 shadow-sm mt-16"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">About CropMind</h2>
        </div>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>
            <strong className="text-foreground">CropMind</strong> is an APAC Agricultural Intelligence Network built for the Google Cloud Gen AI Academy APAC 2026. It demonstrates how agentic AI, real-world data grounding, and vector similarity search can be combined into a production-ready system that serves 500M+ smallholder farmers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            <div className="border rounded-lg p-4 bg-primary/5">
              <h4 className="font-bold text-foreground text-sm mb-2">Track 1: ADK Multi-Agent</h4>
              <p className="text-xs">4 LlmAgent instances executed via InMemoryRunner with FunctionTool bindings. Orchestrator manages sessions, parallel execution, and conflict resolution using Gemini 2.5 Flash/Pro.</p>
            </div>
            <div className="border rounded-lg p-4 bg-secondary/5">
              <h4 className="font-bold text-foreground text-sm mb-2">Track 2: MCP Tool Server</h4>
              <p className="text-xs">Standards-compliant MCP server (@modelcontextprotocol/sdk) with SSE transport. 4 tools (Weather, CropAlerts, MarketPrices, Subsidies) accessible by any MCP client.</p>
            </div>
            <div className="border rounded-lg p-4 bg-accent/20">
              <h4 className="font-bold text-foreground text-sm mb-2">Track 3: AlloyDB pgvector</h4>
              <p className="text-xs">550+ historical farmer cases across 10 APAC countries with vector embeddings for semantic similarity search.</p>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground text-lg">Deployment to Google Cloud</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Step 1: Provision AlloyDB
                </h4>
                <p className="text-xs mb-2">Create an AlloyDB for PostgreSQL cluster in your GCP project. Enable the pgvector extension and run the schema migration:</p>
                <code className="block bg-background border rounded p-2 text-[11px] font-mono">
                  gcloud alloydb clusters create cropmind-cluster --region=asia-southeast1<br/>
                  gcloud alloydb instances create cropmind-primary --cluster=cropmind-cluster --instance-type=PRIMARY<br/>
                  psql $ALLOYDB_URL -c "CREATE EXTENSION IF NOT EXISTS vector"<br/>
                  pnpm run db:push
                </code>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4" /> Step 2: Deploy to Cloud Run
                </h4>
                <p className="text-xs mb-2">Build the container and deploy the API server and React frontend:</p>
                <code className="block bg-background border rounded p-2 text-[11px] font-mono">
                  gcloud builds submit --tag gcr.io/$PROJECT_ID/cropmind-api<br/>
                  gcloud run deploy cropmind-api --image gcr.io/$PROJECT_ID/cropmind-api \<br/>
                  &nbsp;&nbsp;--region asia-southeast1 --allow-unauthenticated \<br/>
                  &nbsp;&nbsp;--set-env-vars DATABASE_URL=$ALLOYDB_URL \<br/>
                  &nbsp;&nbsp;--set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID \<br/>
                  &nbsp;&nbsp;--add-cloudsql-instances $ALLOYDB_CONNECTION_NAME
                </code>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Step 3: Configure Vertex AI (Production)
                </h4>
                <p className="text-xs mb-2">For production, swap the LLM provider to Vertex AI with Gemini models:</p>
                <code className="block bg-background border rounded p-2 text-[11px] font-mono">
                  AGENT_MODEL=gemini-2.0-flash<br/>
                  EMBEDDING_MODEL=text-embedding-005<br/>
                  VERTEX_AI_PROJECT=$PROJECT_ID<br/>
                  VERTEX_AI_LOCATION=asia-southeast1
                </code>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="font-bold text-foreground text-lg mb-3">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {["TypeScript", "Google ADK 0.5", "@modelcontextprotocol/sdk", "Node.js", "Express", "React", "Vite", "TailwindCSS", "Framer Motion", "Gemini 2.5 Flash", "Gemini 2.5 Pro", "gemini-embedding-001", "Cloud SQL PostgreSQL", "pgvector", "Drizzle ORM", "React Query", "SSE Streaming", "Cloud Run", "Multimodal (Image+Text)"].map(tech => (
                <span key={tech} className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">{tech}</span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
