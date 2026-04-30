import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Lightbulb,
  PlayCircle,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  useDemoBrief,
  type DemoBrief,
  type DemoDataFootprint,
  type DemoSampleCase,
  type DemoStatus,
} from "@/hooks/use-api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const statusStyles: Record<DemoStatus, string> = {
  ready: "border-success/25 bg-success/10 text-success",
  watch: "border-warning/25 bg-warning/10 text-warning",
  next: "border-secondary/25 bg-secondary/10 text-secondary",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function downloadDemoBrief(data: DemoBrief) {
  const lines = [
    "# CropMind Judge Demo Brief",
    "",
    data.headline,
    "",
    `Opening hook: ${data.openingHook}`,
    "",
    "## Run Of Show",
    ...data.demoFlow.map(
      (step) =>
        `${step.step}. ${step.title} (${step.durationSeconds}s, ${step.route}) - ${step.judgeSignal}`,
    ),
    "",
    "## Sample Cases",
    ...data.sampleCases.map(
      (item) =>
        `- ${item.title} [${item.preferredLanguage}]: ${item.query}`,
    ),
    "",
    "## Closing",
    data.closingScript,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cropmind-judge-demo-${new Date().toISOString().slice(0, 10)}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: DemoStatus }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold capitalize", statusStyles[status])}>
      {status}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function DataFootprint({ footprint }: { footprint: DemoDataFootprint }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={AlertTriangle}
        label="Active APAC Alerts"
        value={formatNumber(footprint.activeAlerts)}
        detail={`${footprint.criticalAlerts} critical threats`}
      />
      <MetricCard
        icon={Gauge}
        label="Countries Covered"
        value={formatNumber(footprint.countriesCovered)}
        detail={`${footprint.cropTypes} crop types tracked`}
      />
      <MetricCard
        icon={Route}
        label="Market Rows"
        value={formatNumber(footprint.marketRows)}
        detail="Used for business and risk signals"
      />
      <MetricCard
        icon={ShieldCheck}
        label="Support Programs"
        value={formatNumber(footprint.activeSubsidyPrograms)}
        detail="Used for farmer support matching"
      />
    </div>
  );
}

function RunOfShow({ steps }: { steps: DemoBrief["demoFlow"] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <PlayCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">5-Minute Run Of Show</h2>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.step} className="rounded-lg border bg-background p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.step}
                </span>
                <div>
                  <p className="font-extrabold">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.narration}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                {step.durationSeconds}s
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-foreground">{step.judgeSignal}</p>
              <Link
                href={step.route}
                className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold hover:border-primary/40"
              >
                Open Route
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SampleCaseCard({ item }: { item: DemoSampleCase }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.persona}</p>
          <h3 className="mt-1 font-extrabold">{item.title}</h3>
        </div>
        <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
          {item.preferredLanguage}
        </span>
      </div>
      <p className="rounded-lg bg-muted/45 p-3 text-sm">{item.query}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyText(item.query)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold hover:border-primary/40"
        >
          <Clipboard className="h-3.5 w-3.5" />
          Copy Prompt
        </button>
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
          Diagnose
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {item.expectedEvidence.map((evidence) => (
          <div key={evidence} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <span>{evidence}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SampleCases({ cases }: { cases: DemoSampleCase[] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Sample Judge Cases</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {cases.map((item) => (
          <SampleCaseCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ProofPillars({ data }: { data: DemoBrief }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Winning Proof Pillars</h2>
      </div>
      <div className="space-y-3">
        {data.proofPillars.map((item) => (
          <div key={item.pillar} className="rounded-lg border bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold">{item.pillar}</p>
              <Link href={item.route} className="text-xs font-bold text-primary hover:underline">
                {item.route}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">{item.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechnicalHighlights({ data }: { data: DemoBrief }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Technical Highlights</h2>
      </div>
      <div className="space-y-3">
        {data.technicalHighlights.map((item) => (
          <div key={item.track} className="rounded-lg bg-muted/40 p-3">
            <p className="font-bold">{item.track}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaunchReadiness({ data }: { data: DemoBrief }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Launch Readiness</h2>
      </div>
      <div className="space-y-3">
        {data.launchReadiness.map((item) => (
          <div key={item.area} className="rounded-lg border bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold">{item.area}</p>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-muted-foreground">{item.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosingScript({ data }: { data: DemoBrief }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Closing Script</h2>
      </div>
      <p className="rounded-lg bg-primary/5 p-4 text-sm font-bold leading-relaxed">{data.closingScript}</p>
      <div className="mt-4 space-y-2">
        {data.submissionChecklist.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DemoRoomPage() {
  const { data, isLoading, isError, refetch, isFetching } = useDemoBrief();

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        Loading judge demo room...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-xl font-bold">Could not load demo brief</h1>
        <p className="mt-2 text-sm text-muted-foreground">The demo endpoint is unavailable.</p>
        <button type="button" onClick={() => refetch()} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Judge Demo Room
          </div>
          <h1 className="text-3xl font-extrabold md:text-4xl">5-Minute Winning Demo</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{data.headline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadDemoBrief(data)}
            className="inline-flex w-fit items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-bold hover:border-primary/40"
          >
            <Download className="h-4 w-4" />
            Export Brief
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex w-fit items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-bold hover:border-primary/40"
          >
            <RefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Opening Hook</p>
        <p className="mt-2 text-lg font-extrabold leading-relaxed">{data.openingHook}</p>
      </div>

      <DataFootprint footprint={data.dataFootprint} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <RunOfShow steps={data.demoFlow} />
          <SampleCases cases={data.sampleCases} />
        </div>
        <div className="space-y-6">
          <ProofPillars data={data} />
          <TechnicalHighlights data={data} />
          <LaunchReadiness data={data} />
          <ClosingScript data={data} />
        </div>
      </div>
    </motion.div>
  );
}
