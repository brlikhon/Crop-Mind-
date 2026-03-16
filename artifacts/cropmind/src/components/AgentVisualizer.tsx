import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Bug, CloudRain, TrendingUp, FlaskConical, CheckCircle2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STEPS = [
  { id: "orchestrator", icon: BrainCircuit, label: "ADK Orchestrator Analyzing", desc: "Parsing query & determining required sub-agents" },
  { id: "disease", icon: Bug, label: "Crop Disease Agent", desc: "Running differential diagnosis on symptoms" },
  { id: "context", icon: CloudRain, label: "Environment & Market Tools", desc: "Fetching Open-Meteo & MCP Market Data" },
  { id: "treatment", icon: FlaskConical, label: "Treatment Protocol Agent", desc: "Formulating action plan based on constraints" },
  { id: "vector", icon: TrendingUp, label: "AlloyDB Vector Search", desc: "Finding top historical matches via pgvector" },
];

export function AgentVisualizer() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Simulate progression while API call is pending
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev; // Hold at last step until actual API completes
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

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
          animate={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
      
      <h3 className="text-lg font-bold text-center mb-8 flex items-center justify-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
        Multi-Agent System Active
      </h3>

      <div className="space-y-6">
        {STEPS.map((step, idx) => {
          const isActive = idx === activeStep;
          const isPast = idx < activeStep;
          const Icon = isActive ? step.icon : (isPast ? CheckCircle2 : step.icon);
          
          return (
            <div key={step.id} className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500",
                isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" : 
                isPast ? "bg-success/20 text-success" : 
                "bg-muted text-muted-foreground"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
              </div>
              <div className="pt-2 flex-1">
                <p className={cn(
                  "font-bold transition-colors duration-300",
                  isActive ? "text-foreground" : isPast ? "text-foreground/80" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  );
}
