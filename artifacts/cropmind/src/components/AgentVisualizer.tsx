import { motion } from "framer-motion";
import { BrainCircuit, Bug, CloudRain, BarChart3, FlaskConical, CheckCircle2, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AgentTrace } from "@/hooks/use-api";

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
  isLoading: boolean;
  totalDurationMs?: number;
}

export function AgentVisualizer({ traces, isLoading, totalDurationMs }: AgentVisualizerProps) {
  const completedCount = traces.length;
  const progress = isLoading ? Math.min(completedCount / 4 * 0.9, 0.9) : 1;

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
            Multi-Agent System Active
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 text-success" />
            Analysis Complete
          </>
        )}
      </h3>
      {totalDurationMs != null && !isLoading && (
        <p className="text-center text-xs text-muted-foreground mb-6">
          {completedCount} agents in {(totalDurationMs / 1000).toFixed(1)}s
        </p>
      )}

      <div className="space-y-4 mt-6">
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
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{trace.output.summary}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-1" />
            </motion.div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-muted-foreground">Processing...</p>
              <p className="text-sm text-muted-foreground mt-0.5">Waiting for agents to complete</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
