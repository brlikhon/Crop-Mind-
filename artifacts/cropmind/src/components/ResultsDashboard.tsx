import { motion } from "framer-motion";
import { 
  type DiagnoseResponse, 
  type CaseSearchResponse,
  type AgentTrace,
  type OrchestratorDecision
} from "@/hooks/use-api";
import { Check, AlertTriangle, Info, MapPin, ChevronRight, Activity, Cpu, Database, Droplets } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Sub-components for better organization
function ConfidenceBadge({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  const colorClass = percent >= 80 ? "bg-success/15 text-success border-success/30" : 
                     percent >= 60 ? "bg-warning/15 text-warning-foreground border-warning/30" : 
                     "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1", colorClass)}>
      {percent >= 80 ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {percent}% Match
    </div>
  );
}

function FinalRecommendationCard({ data }: { data: DiagnoseResponse }) {
  return (
    <div className="col-span-full mt-8 bg-gradient-to-br from-primary to-primary/90 rounded-3xl p-8 shadow-2xl text-primary-foreground relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Unified Action Plan</h2>
            <div className="ml-auto">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                Confidence: {Math.round(data.confidenceScore * 100)}%
              </span>
            </div>
          </div>
          
          <p className="text-lg md:text-xl font-medium leading-relaxed text-white/90 mb-6">
            {data.finalRecommendation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {data.treatmentProtocol && (
              <div className="bg-black/20 rounded-2xl p-6 backdrop-blur-md">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4 text-secondary" />
                  Immediate Actions
                </h4>
                <ul className="space-y-3">
                  {data.treatmentProtocol.immediateActions.map((action, i) => (
                    <li key={i} className="flex gap-3 text-sm text-white/80">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.marketIntelligence && (
              <div className="bg-black/20 rounded-2xl p-6 backdrop-blur-md">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  Economic Outlook
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Current Price</p>
                    <p className="text-lg font-semibold">{data.marketIntelligence.currentPrice}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Recommendation</p>
                    <p className="text-sm text-white/80">{data.marketIntelligence.recommendation}</p>
                  </div>
                  {data.marketIntelligence.availableSubsidies?.length > 0 && (
                     <div className="pt-2">
                       <p className="text-xs text-secondary font-bold uppercase tracking-wider mb-2">Available Subsidies</p>
                       <div className="flex flex-wrap gap-2">
                         {data.marketIntelligence.availableSubsidies.map((sub, i) => (
                           <span key={i} className="bg-white/10 px-2 py-1 rounded text-xs border border-white/20">
                             {sub}
                           </span>
                         ))}
                       </div>
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dummy icon for trend, since we used TrendingUp elsewhere but didn't import it at top
import { TrendingUp } from "lucide-react"; 

export function ResultsDashboard({ 
  diagnosis, 
  cases 
}: { 
  diagnosis: DiagnoseResponse, 
  cases?: CaseSearchResponse 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full mt-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Agent Reasoning */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Agent Reasoning</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {diagnosis.traces.map((trace, idx) => (
              <div key={idx} className="border rounded-xl p-4 hover:border-primary/30 transition-colors bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-foreground">{trace.agentName}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider",
                    trace.output.status === 'success' ? "bg-success/10 text-success" :
                    trace.output.status === 'skipped' ? "bg-muted text-muted-foreground" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {trace.output.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{trace.output.summary}</p>
                {trace.output.confidence > 0 && (
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full" 
                      style={{ width: `${trace.output.confidence * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: MCP Tool Activity */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
            <Database className="w-5 h-5 text-secondary" />
            <h3 className="font-bold">Orchestrator & MCP</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="relative border-l-2 border-muted ml-3 space-y-6 pb-4">
              {diagnosis.orchestratorDecisions.map((dec, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className={cn(
                    "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center",
                    dec.action === 'invoked' ? "bg-secondary" :
                    dec.action === 'conflict_resolved' ? "bg-warning" : "bg-muted"
                  )}></div>
                  <h4 className="font-bold text-sm">{dec.agentName}</h4>
                  <p className="text-xs font-medium text-foreground/70 mt-0.5 uppercase tracking-wide">
                    Action: <span className={cn(
                      dec.action === 'invoked' && "text-secondary",
                      dec.action === 'conflict_resolved' && "text-warning"
                    )}>{dec.action.replace('_', ' ')}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 bg-muted/30 p-2 rounded-lg border border-border/50">
                    {dec.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 3: Similar Cases (AlloyDB) */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-accent-foreground" />
              <h3 className="font-bold">pgvector Matches</h3>
            </div>
            {cases && <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-md border">{cases.candidatesFound} checked</span>}
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {!cases ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                Searching vector store...
              </div>
            ) : cases.results.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center pt-8">No highly similar historical cases found.</p>
            ) : (
              cases.results.map((c, idx) => (
                <div key={c.caseId} className="border rounded-xl p-4 bg-background/50 hover:bg-background transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground line-clamp-1" title={c.diagnosis}>{c.diagnosis}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {c.region}, {c.country}
                      </p>
                    </div>
                    <ConfidenceBadge score={c.similarityScore} />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-foreground font-medium mb-1">Treatment Applied:</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.treatmentApplied}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Outcome:</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", c.outcomeScore > 0.7 ? "bg-success" : "bg-warning")}
                        style={{ width: `${c.outcomeScore * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{Math.round(c.outcomeScore * 100)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <FinalRecommendationCard data={diagnosis} />

      </div>
    </motion.div>
  );
}
