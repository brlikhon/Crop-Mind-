import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  type DiagnoseResponse,
  type CaseSearchResponse,
  type McpToolCallEntry,
  type AgentTrace,
} from "@/hooks/use-api";
import {
  Check,
  AlertTriangle,
  MapPin,
  Activity,
  Cpu,
  Database,
  Droplets,
  Server,
  TrendingUp,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Bug,
  Leaf,
  Calendar,
  DollarSign,
  ClipboardList,
  Save,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FOLLOW_UP_STORAGE_KEY = "cropmind.followups.v1";

type FollowUpStatus = "not_started" | "improving" | "same" | "worse" | "resolved";

interface StoredFollowUpRecord {
  dueDays: number;
  status: FollowUpStatus;
  notes: string;
  savedAt?: string;
  caseStoreMessage?: string;
  caseStoreSuccess?: boolean;
}

const FOLLOW_UP_STATUS_META: Record<FollowUpStatus, { label: string; score: number }> = {
  not_started: { label: "Not checked yet", score: 0.5 },
  improving: { label: "Improving", score: 0.75 },
  same: { label: "No change", score: 0.45 },
  worse: { label: "Getting worse", score: 0.15 },
  resolved: { label: "Resolved", score: 0.95 },
};

function getStoredFollowUps(): Record<string, StoredFollowUpRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FOLLOW_UP_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, StoredFollowUpRecord> : {};
  } catch {
    return {};
  }
}

function persistFollowUp(sessionId: string, record: StoredFollowUpRecord) {
  if (typeof window === "undefined") return;
  const records = getStoredFollowUps();
  records[sessionId] = record;
  window.localStorage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify(records));
}

function getSafetyWarnings(data: DiagnoseResponse): string[] {
  const protocolWarnings = data.treatmentProtocol?.safetyWarnings?.filter(Boolean) ?? [];
  if (protocolWarnings.length > 0) return protocolWarnings;

  return [
    "Use locally approved products only and follow the label dosage.",
    "Wear gloves and a mask when handling sprays or concentrated treatments.",
    "Avoid spraying before rain, during strong wind, or near children, animals, and water sources.",
  ];
}

function getEscalationAdvice(data: DiagnoseResponse): string {
  if (data.confidenceScore < 0.6) {
    return "Diagnosis confidence is limited. Ask an extension officer to confirm before applying chemical treatment.";
  }
  if (data.weatherAssessment?.weatherRisk?.toLowerCase().includes("high")) {
    return "Weather risk is high. Recheck timing before applying treatment and protect the field from spread.";
  }
  return "If symptoms spread after 48 hours or more plants are affected, contact a local extension officer.";
}

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

function McpToolCallCard({ call }: { call: McpToolCallEntry }) {
  return (
    <div className="border rounded-lg p-3 bg-background/50 hover:border-secondary/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-secondary" />
          <span className="font-bold text-xs">{call.toolName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold",
            call.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {call.success ? "OK" : "ERR"}
          </span>
          {call.durationMs != null && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{call.durationMs}ms
            </span>
          )}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        <p className="font-medium text-foreground/70 mb-1">Called by: {call.calledBy}</p>
        <div className="bg-muted/50 rounded p-2 font-mono text-[10px] break-all">
          <span className="text-foreground/50">params: </span>
          {JSON.stringify(call.params)}
        </div>
        {call.success && call.data != null && (
          <div className="bg-muted/50 rounded p-2 font-mono text-[10px] mt-1 max-h-20 overflow-y-auto break-all">
            <span className="text-foreground/50">result: </span>
            {(() => {
              const str = typeof call.data === "string" ? call.data : JSON.stringify(call.data);
              return str.length > 200 ? str.substring(0, 200) + "..." : str;
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpTracker({ data }: { data: DiagnoseResponse }) {
  const defaultRecord = useMemo<StoredFollowUpRecord>(() => ({
    dueDays: 5,
    status: "not_started",
    notes: "",
  }), [data.sessionId]);

  const [record, setRecord] = useState<StoredFollowUpRecord>(defaultRecord);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = getStoredFollowUps()[data.sessionId];
    setRecord(stored ?? defaultRecord);
  }, [data.sessionId, defaultRecord]);

  const dueDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + record.dueDays);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, [record.dueDays]);

  const saveRecord = (nextRecord = record) => {
    const savedRecord = { ...nextRecord, savedAt: new Date().toISOString() };
    persistFollowUp(data.sessionId, savedRecord);
    setRecord(savedRecord);
  };

  const submitLearningCase = async () => {
    setIsSubmitting(true);
    const score = FOLLOW_UP_STATUS_META[record.status].score;
    const body = {
      cropType: data.query?.cropType ?? "unspecified",
      country: data.query?.country ?? "unspecified",
      region: data.query?.region ?? "unspecified",
      symptomsText: data.query?.rawQuery ?? "",
      diagnosis: data.diagnosis?.primaryDiagnosis ?? "Unknown diagnosis",
      treatmentApplied: data.treatmentProtocol?.immediateActions?.join(" | ") ?? data.finalRecommendation,
      outcomeScore: score,
    };

    try {
      const res = await fetch("/api/cases/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({ message: "Follow-up saved locally." }));
      const nextRecord = {
        ...record,
        savedAt: new Date().toISOString(),
        caseStoreSuccess: Boolean(payload.success),
        caseStoreMessage: typeof payload.message === "string" ? payload.message : "Follow-up saved locally.",
      };
      saveRecord(nextRecord);
    } catch (err) {
      const nextRecord = {
        ...record,
        savedAt: new Date().toISOString(),
        caseStoreSuccess: false,
        caseStoreMessage: err instanceof Error ? err.message : "Follow-up saved locally. Case store unavailable.",
      };
      saveRecord(nextRecord);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="col-span-full bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Follow-up Tracker</h3>
        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md border ml-auto">
          Check again on {dueDate}
        </span>
      </div>
      <div className="p-5 grid gap-5 lg:grid-cols-[1fr_1fr_auto]">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Next field check</p>
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRecord(prev => ({ ...prev, dueDays: days }))}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-bold transition-colors",
                  record.dueDays === days
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:border-primary/40"
                )}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Observed outcome</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["improving", "same", "worse", "resolved"] as FollowUpStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setRecord(prev => ({ ...prev, status }))}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                  record.status === status
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-background hover:border-secondary/40"
                )}
              >
                {FOLLOW_UP_STATUS_META[status].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-48">
          <button
            type="button"
            onClick={() => saveRecord()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            type="button"
            onClick={submitLearningCase}
            disabled={isSubmitting || record.status === "not_started"}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors",
              isSubmitting || record.status === "not_started"
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            Learn
          </button>
        </div>

        <div className="lg:col-span-3">
          <textarea
            value={record.notes}
            onChange={(e) => setRecord(prev => ({ ...prev, notes: e.target.value }))}
            aria-label="Follow-up notes"
            placeholder="Notes from the follow-up visit, symptom change, or farmer feedback..."
            className="w-full min-h-20 rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary/60"
          />
          {record.savedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Saved {new Date(record.savedAt).toLocaleString()}
            </p>
          )}
          {record.caseStoreMessage && (
            <p className={cn(
              "mt-2 flex items-center gap-2 text-xs font-medium",
              record.caseStoreSuccess ? "text-success" : "text-muted-foreground"
            )}>
              {record.caseStoreSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {record.caseStoreMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FinalRecommendationCard({ data }: { data: DiagnoseResponse }) {
  const diagTrace = data.traces.find(t => t.agentName === "CropDiseaseAgent");
  const diagDetails = diagTrace?.output?.details as Record<string, unknown> | undefined;
  const diagnosisInfo = diagDetails?.diagnosis as Record<string, unknown> | undefined;
  const primaryDiagnosis = data.diagnosis?.primaryDiagnosis ?? diagnosisInfo?.primaryDiagnosis as string | undefined;

  const treatTrace = data.traces.find(t => t.agentName === "TreatmentProtocolAgent");
  const treatDetails = treatTrace?.output?.details as Record<string, unknown> | undefined;
  const preventiveMeasures = (treatDetails?.preventiveMeasures ?? data.treatmentProtocol?.preventiveMeasures) as string[] | string | undefined;
  const safetyWarnings = getSafetyWarnings(data);
  const timelineText = data.treatmentProtocol?.timelineWeeks
    ? `${data.treatmentProtocol.timelineWeeks} week${data.treatmentProtocol.timelineWeeks === 1 ? "" : "s"}`
    : "Monitor daily";
  const estimatedCost = data.treatmentProtocol?.estimatedCost || "Not estimated";
  const weatherTiming = data.weatherAssessment?.adaptations?.[0] ?? data.weatherAssessment?.weatherRisk ?? "Check local rain and wind before treatment.";
  const diagnosisSources = data.diagnosis?.sources ?? [];
  const treatmentSources = data.treatmentProtocol?.sources ?? [];

  return (
    <div className="col-span-full mt-8 bg-primary rounded-2xl p-6 md:p-8 shadow-2xl text-primary-foreground">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Farmer Action Plan</h2>
              <p className="text-sm text-white/70">A field-ready summary from the agent team</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm w-fit">
              {data.query.preferredLanguage || "English"}
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm w-fit">
              Confidence: {Math.round(data.confidenceScore * 100)}%
            </span>
          </div>
        </div>

        {primaryDiagnosis && (
          <div className="bg-black/20 rounded-xl p-5 backdrop-blur-md flex items-start gap-4">
            <div className="p-2 bg-white/15 rounded-lg">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white/70 uppercase tracking-wider mb-1">Primary Diagnosis</h4>
              <p className="text-lg font-semibold text-white">{primaryDiagnosis}</p>
            </div>
          </div>
        )}

        <p className="text-lg md:text-xl font-medium leading-relaxed text-white/90">
          {data.finalRecommendation}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-black/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
              <DollarSign className="w-4 h-4" />
              Treatment Cost
            </div>
            <p className="font-semibold text-white">{estimatedCost}</p>
          </div>
          <div className="bg-black/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4" />
              Recovery Window
            </div>
            <p className="font-semibold text-white">{timelineText}</p>
          </div>
          <div className="bg-black/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
              <Clock className="w-4 h-4" />
              Timing Check
            </div>
            <p className="text-sm text-white/85">{weatherTiming}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data.treatmentProtocol && (
            <div className="bg-black/20 rounded-xl p-6 backdrop-blur-md">
              <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-secondary" />
                Do Today
              </h4>
              <ul className="space-y-3">
                {data.treatmentProtocol.immediateActions.map((action, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/85">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-black/20 rounded-xl p-6 backdrop-blur-md">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-secondary" />
              Safety Checks
            </h4>
            <ul className="space-y-3">
              {safetyWarnings.map((warning, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/85">
                  <AlertTriangle className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-white/10 p-3 text-sm text-white/85">
              {getEscalationAdvice(data)}
            </p>
          </div>

          <div className="bg-black/20 rounded-xl p-6 backdrop-blur-md">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              Prevent Recurrence
            </h4>
            {preventiveMeasures ? (
              <ul className="space-y-3">
                {(Array.isArray(preventiveMeasures) ? preventiveMeasures : [preventiveMeasures]).map((measure, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/85">
                    <Leaf className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                    <span>{measure}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/75">No preventive plan was generated for this case.</p>
            )}
          </div>
        </div>

        {(data.marketIntelligence || data.treatmentProtocol?.localResources?.length) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.marketIntelligence && (
              <div className="bg-black/20 rounded-xl p-6 backdrop-blur-md">
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
                    <p className="text-sm text-white/85">{data.marketIntelligence.recommendation}</p>
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

            {data.treatmentProtocol?.localResources?.length ? (
              <div className="bg-black/20 rounded-xl p-6 backdrop-blur-md">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-secondary" />
                  Local Resources
                </h4>
                <ul className="space-y-3">
                  {data.treatmentProtocol.localResources.map((resource, i) => (
                    <li key={i} className="flex gap-3 text-sm text-white/85">
                      <Leaf className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                      <span>{resource}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {(diagnosisSources.length > 0 || treatmentSources.length > 0) && (
          <div className="bg-black/20 rounded-xl p-5 backdrop-blur-md">
            <h4 className="font-bold text-sm text-white/70 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Grounding Sources
            </h4>
            <ul className="space-y-1.5">
              {[...diagnosisSources, ...treatmentSources].slice(0, 6).map((src, i) => (
                <li key={`${src}-${i}`}>
                  <a href={src} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-secondary underline hover:text-white break-all">
                    {src}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

interface ResultsDashboardProps {
  diagnosis?: DiagnoseResponse | null;
  cases?: CaseSearchResponse;
  liveTraces?: AgentTrace[];
  liveMcpCalls?: McpToolCallEntry[];
  isStreaming?: boolean;
}

export function ResultsDashboard({
  diagnosis,
  cases,
  liveTraces = [],
  liveMcpCalls = [],
  isStreaming = false,
}: ResultsDashboardProps) {
  const traces = diagnosis?.traces ?? liveTraces;
  const mcpCalls = diagnosis?.mcpToolCalls ?? liveMcpCalls;
  const hasTraces = traces.length > 0;
  const hasMcpCalls = mcpCalls.length > 0;
  const showPanels = hasTraces || hasMcpCalls || isStreaming;

  if (!showPanels) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full mt-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Agent Reasoning</h3>
            {hasTraces && (
              <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md border ml-auto">
                {traces.length} agents
              </span>
            )}
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {traces.length === 0 && isStreaming ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2 min-h-[100px]">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Agents analyzing...
              </div>
            ) : (
              traces.map((trace, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-xl p-4 hover:border-primary/30 transition-colors bg-background/50"
                >
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
                  <p className="text-sm text-muted-foreground mb-2">{trace.output.summary}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{trace.durationMs}ms</span>
                  </div>
                  {trace.output.confidence > 0 && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-2">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${trace.output.confidence * 100}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
            <Server className="w-5 h-5 text-secondary" />
            <h3 className="font-bold">MCP Tool Activity</h3>
            {hasMcpCalls && (
              <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md border ml-auto">
                {mcpCalls.length} calls
              </span>
            )}
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {mcpCalls.length === 0 && isStreaming ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2 min-h-[100px]">
                <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                Awaiting MCP calls...
              </div>
            ) : mcpCalls.length > 0 ? (
              mcpCalls.map((call, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                  <McpToolCallCard call={call} />
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center pt-8">No MCP tool calls recorded.</p>
            )}

            {diagnosis?.conflictResolutions && diagnosis.conflictResolutions.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-bold text-xs text-warning uppercase tracking-wider mb-3">Conflict Resolutions</h4>
                {diagnosis.conflictResolutions.map((conflict, idx) => (
                  <div key={idx} className="border border-warning/30 rounded-lg p-3 bg-warning/5">
                    <p className="text-xs font-bold">{conflict.conflictType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{conflict.resolution}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {conflict.agentA} vs {conflict.agentB} — chose {conflict.chosenAgent}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2 min-h-[100px]">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Searching vector store...
              </div>
            ) : cases.results.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center pt-8">No highly similar historical cases found.</p>
            ) : (
              cases.results.map((c) => (
                <motion.div key={c.caseId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="border rounded-xl p-4 bg-background/50 hover:bg-background transition-colors">
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
                </motion.div>
              ))
            )}
          </div>
        </div>

        {diagnosis && (
          <>
            <FinalRecommendationCard data={diagnosis} />
            <FollowUpTracker data={diagnosis} />
          </>
        )}

      </div>
    </motion.div>
  );
}
