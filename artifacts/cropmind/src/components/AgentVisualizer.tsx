import { motion } from "framer-motion";
import { BrainCircuit, Bug, CloudRain, BarChart3, FlaskConical, CheckCircle2, Loader2, Server, Sparkles } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AgentTrace, McpToolCallEntry } from "@/hooks/use-api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AGENT_ICONS: Record<string, typeof BrainCircuit> = {
  CropDiseaseAgent: Bug,
  WeatherAdaptationAgent: CloudRain,
  MarketSubsidyAgent: BarChart3,
  TreatmentProtocolAgent: FlaskConical,
};

interface AgentVisualizerProps {
  traces: AgentTrace[];
  activeAgents: string[];
  mcpCalls: McpToolCallEntry[];
  isSynthesizing: boolean;
  isLoading: boolean;
  totalDurationMs?: number;
}

export function AgentVisualizer({ traces, activeAgents, mcpCalls, isSynthesizing, isLoading, totalDurationMs }: AgentVisualizerProps) {
  const completedCount = traces.length;
  const totalSteps = 5;
  const progress = isLoading
    ? Math.min((completedCount + activeAgents.length * 0.5 + (isSynthesizing ? 0.5 : 0)) / totalSteps, 0.95)
    : 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto my-12 bg-card rounded-2xl p-8 shadow-xl border relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      <h3 className="text-lg font-bold text-center mb-2 flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
            {isSynthesizing ? "Synthesizing Recommendation..." : "Multi-Agent System Active"}
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 text-success" />
            Analysis Complete
          </>
        )}
      </h3>
      {totalDurationMs != null && !isLoading && (
        <p className="text-center text-xs text-muted-foreground mb-4">
          {completedCount} agents &middot; {mcpCalls.length} MCP calls &middot; {(totalDurationMs / 1000).toFixed(1)}s
        </p>
      )}

      <div className="space-y-3 mt-6">
        {traces.map((trace) => {
          const Icon = AGENT_ICONS[trace.agentName] ?? BrainCircuit;
          const isSuccess = trace.output.status === "success";
          return (
            <motion.div
              key={trace.agentName}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                isSuccess ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">{trace.agentName}</p>
                  <span className="text-xs text-muted-foreground">{trace.durationMs}ms</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{trace.output.summary}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-1" />
            </motion.div>
          );
        })}

        {activeAgents.map((agentName) => {
          const Icon = AGENT_ICONS[agentName] ?? BrainCircuit;
          return (
            <motion.div
              key={`active-${agentName}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{agentName}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Running...</p>
              </div>
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 mt-1" />
            </motion.div>
          );
        })}

        {mcpCalls.length > 0 && isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 pl-14 flex-wrap"
          >
            {mcpCalls.slice(-4).map((call, i) => (
              <span key={i} className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full flex items-center gap-1">
                <Server className="w-2.5 h-2.5" />
                {call.toolName}
              </span>
            ))}
          </motion.div>
        )}

        {isSynthesizing && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Synthesis</p>
              <p className="text-sm text-muted-foreground mt-0.5">Generating unified recommendation...</p>
            </div>
            <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 mt-1" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
