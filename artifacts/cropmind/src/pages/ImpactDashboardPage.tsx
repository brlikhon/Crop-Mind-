import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Download,
  Landmark,
  LineChart,
  RefreshCcw,
  ShieldCheck,
  Sprout,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  useImpactOverview,
  type BusinessCase,
  type CountryImpact,
  type CropImpact,
  type ImpactOverview,
  type ImpactStatus,
  type JudgeScorecardItem,
  type TrustReadinessItem,
} from "@/hooks/use-api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const statusStyles: Record<ImpactStatus, string> = {
  ready: "border-success/25 bg-success/10 text-success",
  next: "border-warning/25 bg-warning/10 text-warning",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatUsd(value: number, compact = true) {
  return new Intl.NumberFormat(undefined, {
    currency: "USD",
    maximumFractionDigits: 0,
    notation: compact && Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    style: "currency",
  }).format(value);
}

function downloadImpactBrief(data: ImpactOverview) {
  const lines = [
    "# CropMind Sprint 4 Impact Brief",
    "",
    `Generated: ${new Date(data.generatedAt).toLocaleString()}`,
    "",
    "## Modeled Impact",
    `- Active alerts: ${data.summary.activeAlerts}`,
    `- Affected area: ${formatNumber(data.summary.affectedAreaHa)} ha`,
    `- Farmers in affected zones: ${formatNumber(data.summary.estimatedFarmersInAffectedZones)}`,
    `- Modeled value at risk: ${formatUsd(data.summary.modeledValueAtRiskUsd, false)}`,
    `- Conservative first-season savings: ${formatUsd(data.summary.conservativeFirstSeasonSavingsUsd, false)}`,
    `- Pilot benefit/cost ratio: ${data.summary.benefitCostRatio}x`,
    "",
    "## Business Cases",
    ...data.businessCases.map(
      (item) =>
        `- ${item.segment}: ${item.revenueModel}; modeled value ${formatUsd(item.modeledAnnualValueUsd, false)}.`,
    ),
    "",
    "## Judge Evidence",
    ...data.judgeScorecard.map(
      (item) => `- ${item.criterion}: ${item.score}/5 - ${item.evidence}`,
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cropmind-impact-brief-${new Date().toISOString().slice(0, 10)}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: ImpactStatus }) {
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

function CountryImpactTable({ countries }: { countries: CountryImpact[] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Landmark className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Country Impact</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4">Country</th>
              <th className="py-2 pr-4">Alerts</th>
              <th className="py-2 pr-4">Farmers</th>
              <th className="py-2 pr-4">Value At Risk</th>
              <th className="py-2 pr-4">Preventable Loss</th>
              <th className="py-2">Crops</th>
            </tr>
          </thead>
          <tbody>
            {countries.slice(0, 8).map((country) => (
              <tr key={country.country} className="border-b last:border-0">
                <td className="py-3 pr-4 font-bold">{country.country}</td>
                <td className="py-3 pr-4">
                  {country.alertCount}
                  {country.criticalAlerts > 0 && (
                    <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                      {country.criticalAlerts} critical
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">{formatNumber(country.estimatedFarmers)}</td>
                <td className="py-3 pr-4 font-bold">{formatUsd(country.valueAtRiskUsd)}</td>
                <td className="py-3 pr-4 font-bold text-success">{formatUsd(country.preventableLossUsd)}</td>
                <td className="py-3 text-xs text-muted-foreground">{country.cropTypes.slice(0, 4).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CropImpactList({ crops }: { crops: CropImpact[] }) {
  const maxLoss = Math.max(...crops.map((crop) => crop.preventableLossUsd), 1);

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sprout className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Crop Exposure</h2>
      </div>
      <div className="space-y-3">
        {crops.slice(0, 7).map((crop) => (
          <div key={crop.cropType} className="rounded-lg border bg-background p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold capitalize">{crop.cropType}</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(crop.affectedAreaHa)} ha - {formatUsd(crop.valueAtRiskUsd)} at risk
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold capitalize">
                {crop.marketTrend30d === "falling" ? (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-success" />
                )}
                {crop.marketTrend30d}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(8, (crop.preventableLossUsd / maxLoss) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-success">{formatUsd(crop.preventableLossUsd)} preventable</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BusinessCaseGrid({ cases }: { cases: BusinessCase[] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BriefcaseBusiness className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Business Use Cases</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {cases.map((item) => (
          <div key={item.segment} className="rounded-lg border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.buyer}</p>
            <h3 className="mt-1 font-extrabold">{item.segment}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Contract</p>
                <p className="font-bold">{formatUsd(item.annualContractUsd)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Modeled Value</p>
                <p className="font-bold text-success">{formatUsd(item.modeledAnnualValueUsd)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{item.revenueModel}</p>
            <p className="mt-3 text-sm font-bold">{item.proofMetric}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function JudgeScorecard({ items }: { items: JudgeScorecardItem[] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Judge Scorecard</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.criterion} className="rounded-lg border bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold">{item.criterion}</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{item.score}/5</span>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${item.score * 20}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{item.evidence}</p>
            <p className="mt-2 text-xs font-bold text-foreground">{item.nextProof}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProofPlan({ items }: { items: ImpactOverview["proofMilestones"] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Pilot Proof Plan</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={`${item.phase}-${item.metric}`} className="rounded-lg border bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold">{item.phase}</p>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm">{item.metric}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.target} - {item.owner}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustReadiness({ items }: { items: TrustReadinessItem[] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Trust Readiness</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.control} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{item.control}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.evidence}</p>
              <p className="mt-1 text-xs font-bold">{item.owner}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImpactDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useImpactOverview();

  const topCountries = useMemo(() => data?.countryImpacts ?? [], [data]);
  const topCrops = useMemo(() => data?.cropImpacts ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        Loading impact model...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-xl font-bold">Could not load impact dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">The impact endpoint is unavailable.</p>
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
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Impact Evidence Console
          </div>
          <h1 className="text-3xl font-extrabold md:text-4xl">Impact & Business Evidence</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Modeled farmer reach, crop value at risk, pilot ROI, buyer segments, and trust controls for a competition-grade deployment case.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadImpactBrief(data)}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Farmers In Affected Zones"
          value={formatNumber(data.summary.estimatedFarmersInAffectedZones)}
          detail={`${formatNumber(data.summary.affectedAreaHa)} hectares monitored`}
        />
        <MetricCard
          icon={LineChart}
          label="Modeled Value At Risk"
          value={formatUsd(data.summary.modeledValueAtRiskUsd)}
          detail={`${data.summary.activeAlerts} active APAC alerts`}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Preventable Loss"
          value={formatUsd(data.summary.modeledPreventableLossUsd)}
          detail="Addressable through faster action"
        />
        <MetricCard
          icon={Target}
          label="Pilot Benefit/Cost"
          value={`${data.summary.benefitCostRatio}x`}
          detail={`${formatUsd(data.summary.conservativeFirstSeasonSavingsUsd)} first-season savings`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <CountryImpactTable countries={topCountries} />
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <CropImpactList crops={topCrops} />
            <BusinessCaseGrid cases={data.businessCases} />
          </div>
        </div>
        <div className="space-y-6">
          <JudgeScorecard items={data.judgeScorecard} />
          <ProofPlan items={data.proofMilestones} />
          <TrustReadiness items={data.trustReadiness} />
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="text-xl font-bold">Methodology</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {data.methodology.assumptions.map((assumption) => (
                <p key={assumption}>{assumption}</p>
              ))}
              {data.methodology.caveats.map((caveat) => (
                <p key={caveat} className="font-bold text-foreground">{caveat}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
