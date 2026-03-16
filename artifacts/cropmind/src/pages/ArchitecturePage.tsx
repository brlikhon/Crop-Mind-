import { motion } from "framer-motion";
import { Database, Bot, BrainCircuit, MessageSquare, ShieldCheck, Server, Cloud, Cpu } from "lucide-react";

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
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-24">
      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Architecture Deep Dive</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          How CropMind combines Agentic Orchestration, Real-world Context, and Vector Intelligence to serve smallholder farmers.
        </p>
      </div>

      {/* Visual Diagram */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="bg-card border rounded-3xl p-8 shadow-xl mb-16"
      >
        <div className="flex flex-col items-center relative">
          
          {/* Layer 1: Input */}
          <motion.div variants={itemVariants} className="w-full max-w-md bg-background border rounded-xl p-4 flex items-center gap-4 shadow-sm z-10">
            <div className="bg-primary/10 p-3 rounded-lg text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">1. Farmer Input</h3>
              <p className="text-xs text-muted-foreground">Natural language unstructured query via SMS/Web</p>
            </div>
          </motion.div>

          {/* Arrow */}
          <div className="h-8 w-px bg-border my-2"></div>

          {/* Layer 2: Orchestrator */}
          <motion.div variants={itemVariants} className="w-full bg-gradient-to-br from-primary to-primary/80 border-primary rounded-xl p-6 flex flex-col items-center shadow-lg shadow-primary/20 z-10 text-primary-foreground relative">
            <BrainCircuit className="w-10 h-10 mb-3" />
            <h3 className="font-bold text-lg mb-1">2. ADK Orchestrator</h3>
            <p className="text-sm text-primary-foreground/80 text-center max-w-md">
              Parses intent, conditionally routes to sub-agents, resolves conflicting advice (e.g. moisture vs fungal risk), synthesizes final output.
            </p>
            
            {/* Sub-Agents Row inside Orchestrator context */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8">
              {['Disease Agent', 'Weather Agent', 'Market Agent', 'Treatment Agent'].map((agent, i) => (
                <div key={i} className="bg-black/20 backdrop-blur-md rounded-lg p-3 text-center border border-white/10">
                  <Bot className="w-5 h-5 mx-auto mb-2 opacity-80" />
                  <span className="text-xs font-bold">{agent}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Arrows splitting */}
          <div className="flex w-full max-w-2xl justify-around my-4">
             <div className="h-12 w-px bg-border/80 relative before:absolute before:w-2 before:h-2 before:bg-border before:-bottom-1 before:-left-[3.5px] before:rounded-full"></div>
             <div className="h-12 w-px bg-border/80 relative before:absolute before:w-2 before:h-2 before:bg-border before:-bottom-1 before:-left-[3.5px] before:rounded-full"></div>
          </div>

          {/* Layer 3: Context & Data */}
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

          {/* Arrow merging back */}
          <div className="h-10 w-px bg-border my-4"></div>

          {/* Layer 5: Output */}
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

      {/* About Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
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
              <span className="text-sm text-foreground"><strong className="text-primary">ADK Orchestration:</strong> A multi-agent framework that breaks complex agronomic reasoning into specialized roles (disease, weather, market, treatment) and resolves conflicts automatically.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2"></div>
              <span className="text-sm text-foreground"><strong className="text-secondary">MCP Tool Servers:</strong> Secure execution boundaries that give agents live read-access to external APIs (Open-Meteo) and internal PostgreSQL databases.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground mt-2"></div>
              <span className="text-sm text-foreground"><strong className="text-accent-foreground">AlloyDB Vector Intelligence:</strong> Utilizing pgvector to perform semantic similarity searches against a knowledge base of past successful treatments.</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

// Re-importing CheckCircle2 locally for this file
import { CheckCircle2, TrendingUp } from "lucide-react";
