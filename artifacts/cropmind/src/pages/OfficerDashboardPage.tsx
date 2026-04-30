import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Download,
  Filter,
  Landmark,
  MapPin,
  RadioTower,
  RefreshCcw,
  ShieldAlert,
  Sprout,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  useIntelligenceOverview,
  type CountryRiskSummary,
  type InterventionQueueItem,
  type RegionRiskSummary,
  type RiskLevel,
} from "@/hooks/use-api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-success/10 text-success border-success/25",
  medium: "bg-warning/10 text-warning border-warning/25",
  high: "bg-secondary/10 text-secondary border-secondary/25",
  critical: "bg-destructive/10 text-destructive border-destructive/25",
};

const riskDotStyles: Record<RiskLevel, string> = {
  low: "bg-success",
  medium: "bg-warning",
  high: "bg-secondary",
  critical: "bg-destructive",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadInterventionQueue(items: InterventionQueueItem[]) {
  const headers = ["rank", "country", "region", "riskLevel", "riskScore", "affectedAreaHa", "leadThreat", "action"];
  const rows = items.map((item) => [
    item.rank,
    item.country,
    item.region,
    item.riskLevel,
    item.riskScore,
    item.affectedAreaHa,
    item.leadThreat?.threatName ?? "Regional monitoring",
    item.action,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cropmind-field-queue-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold capitalize", riskStyles[level])}>
      <span className={cn("h-2 w-2 rounded-full", riskDotStyles[level])} />
      {level}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof AlertTriangle;
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

function CountryStrip({ countries }: { countries: CountryRiskSummary[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {countries.slice(0, 8).map((country) => (
        <div key={country.country} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">{country.country}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {country.alertCount} alerts
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Critical</p>
              <p className="font-bold text-destructive">{country.criticalAlerts}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Risk</p>
              <p className="font-bold">{country.highestRiskScore}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Programs</p>
              <p className="font-bold">{country.activeSubsidyPrograms}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${country.highestRiskScore}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RegionalRiskMap({
  regions,
  selectedRegionId,
  onSelectRegion,
}: {
  regions: RegionRiskSummary[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Regional Risk Map</h2>
          <p className="text-sm text-muted-foreground">Each cell is a monitored APAC region scored by alert severity, affected area, and crop spread.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(["critical", "high", "medium", "low"] as RiskLevel[]).map((level) => (
            <RiskBadge key={level} level={level} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => onSelectRegion(region.id)}
            className={cn(
              "min-h-32 rounded-lg border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
              selectedRegionId === region.id ? "border-primary bg-primary/5 shadow-md" : "bg-background",
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold">{region.region}</p>
                <p className="text-xs text-muted-foreground">{region.country}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", riskStyles[region.riskLevel])}>
                {region.riskScore}
              </span>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", riskDotStyles[region.riskLevel])} style={{ width: `${region.riskScore}%` }} />
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{region.leadThreat?.threatName ?? region.topThreats[0]}</p>
            <p className="mt-2 text-xs font-bold">{formatNumber(region.affectedAreaHa)} ha affected</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function RegionDetail({ region }: { region: RegionRiskSummary }) {
  const strongestMarketSignal = region.marketSignals.find((signal) => signal.pressure !== "unknown") ?? region.marketSignals[0];

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-muted-foreground">{region.country}</p>
          </div>
          <h2 className="text-2xl font-extrabold">{region.region}</h2>
        </div>
        <RiskBadge level={region.riskLevel} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Risk Score</p>
          <p className="mt-1 text-2xl font-extrabold">{region.riskScore}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Alerts</p>
          <p className="mt-1 text-2xl font-extrabold">{region.alertCount}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Affected Area</p>
          <p className="mt-1 text-2xl font-extrabold">{formatNumber(region.affectedAreaHa)} ha</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Lead Threat
          </h3>
          <div className="rounded-lg border bg-background p-4">
            <p className="font-bold">{region.leadThreat?.threatName ?? "No lead threat"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {region.leadThreat?.cropType ?? region.crops.join(", ")}{" - "}{region.leadThreat?.threatType ?? "monitoring"}
            </p>
            <p className="mt-3 text-sm">{region.priorityAction}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <BriefcaseBusiness className="h-4 w-4 text-secondary" />
            Business Signal
          </h3>
          <div className="rounded-lg border bg-background p-4">
            {strongestMarketSignal ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold capitalize">{strongestMarketSignal.cropType}</p>
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                    {strongestMarketSignal.pressure === "falling" ? <TrendingDown className="h-3 w-3 text-destructive" /> : <TrendingUp className="h-3 w-3 text-success" />}
                    {strongestMarketSignal.pressure}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {strongestMarketSignal.marketsTracked} markets tracked
                  {strongestMarketSignal.avgChange30d !== null ? ` - ${strongestMarketSignal.avgChange30d}% over 30d` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No market signal available.</p>
            )}
            {region.subsidyPrograms.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Eligible Support</p>
                <div className="space-y-2">
                  {region.subsidyPrograms.map((program) => (
                    <div key={program.programId} className="rounded-md bg-muted/50 p-2 text-xs">
                      <p className="font-bold">{program.programName}</p>
                      <p className="text-muted-foreground">{program.benefitType}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold">
          <Sprout className="h-4 w-4 text-primary" />
          Affected Crops
        </h3>
        <div className="flex flex-wrap gap-2">
          {region.crops.map((crop) => (
            <span key={crop} className="rounded-full border bg-background px-3 py-1 text-xs font-bold capitalize">
              {crop}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function InterventionQueue({ items }: { items: InterventionQueueItem[] }) {
  const queue = items;
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Field Team Queue</h2>
      </div>
      <div className="space-y-3">
        {queue.map((item) => (
          <div key={`${item.country}-${item.region}-${item.rank}`} className="rounded-lg border bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.rank}
                </span>
                <div>
                  <p className="font-bold">{item.region}</p>
                  <p className="text-xs text-muted-foreground">{item.country}</p>
                </div>
              </div>
              <RiskBadge level={item.riskLevel} />
            </div>
            <p className="text-sm text-muted-foreground">{item.leadThreat?.threatName ?? "Regional monitoring"}</p>
            <p className="mt-2 text-sm">{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OfficerDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useIntelligenceOverview();
  const [countryFilter, setCountryFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const countries = useMemo(() => data?.countries.map((country) => country.country) ?? [], [data]);
  const filteredRegions = useMemo(() => {
    const source = data?.regions ?? [];
    return source.filter((region) => {
      const countryMatch = countryFilter === "all" || region.country === countryFilter;
      const riskMatch = riskFilter === "all" || region.riskLevel === riskFilter;
      return countryMatch && riskMatch;
    });
  }, [countryFilter, data, riskFilter]);

  const selectedRegion = useMemo(() => {
    if (!filteredRegions.length) return null;
    return filteredRegions.find((region) => region.id === selectedRegionId) ?? filteredRegions[0];
  }, [filteredRegions, selectedRegionId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        Loading regional intelligence...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-xl font-bold">Could not load officer dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">The intelligence endpoint is unavailable.</p>
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
            <RadioTower className="h-3.5 w-3.5 text-primary" />
            Extension Officer Console
          </div>
          <h1 className="text-3xl font-extrabold md:text-4xl">Regional Crop Risk Command Center</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Monitor active APAC crop threats, prioritize field visits, and connect farmers to market and subsidy support.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadInterventionQueue(data.interventionQueue)}
            className="inline-flex w-fit items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-bold hover:border-primary/40"
          >
            <Download className="h-4 w-4" />
            Export Queue
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
        <MetricCard icon={AlertTriangle} label="Active Alerts" value={formatNumber(data.summary.activeAlerts)} detail={`${data.summary.criticalRegions} critical regions`} />
        <MetricCard icon={MapPin} label="Regions At Risk" value={formatNumber(data.summary.regionsAtRisk)} detail={`${data.summary.countriesCovered} countries covered`} />
        <MetricCard icon={Users} label="Affected Area" value={`${formatNumber(data.summary.totalAffectedAreaHa)} ha`} detail="Prioritized for field response" />
        <MetricCard icon={Landmark} label="Support Programs" value={formatNumber(data.summary.activeSubsidyPrograms)} detail={`${data.summary.marketsTracked} market signals tracked`} />
      </div>

      <CountryStrip countries={data.countries} />

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2 font-bold">
            <Filter className="h-4 w-4 text-primary" />
            Focus Filters
          </div>
          <select
            value={countryFilter}
            onChange={(event) => {
              setCountryFilter(event.target.value);
              setSelectedRegionId(null);
            }}
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
            aria-label="Filter by country"
          >
            <option value="all">All countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <select
            value={riskFilter}
            onChange={(event) => {
              setRiskFilter(event.target.value as RiskLevel | "all");
              setSelectedRegionId(null);
            }}
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
            aria-label="Filter by risk"
          >
            <option value="all">All risk levels</option>
            <option value="critical">Critical only</option>
            <option value="high">High only</option>
            <option value="medium">Medium only</option>
            <option value="low">Low only</option>
          </select>
          <span className="text-sm text-muted-foreground md:ml-auto">
            Last generated {new Date(data.generatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <RegionalRiskMap
            regions={filteredRegions}
            selectedRegionId={selectedRegion?.id ?? null}
            onSelectRegion={setSelectedRegionId}
          />
          {selectedRegion && <RegionDetail region={selectedRegion} />}
        </div>
        <div className="space-y-6">
          <InterventionQueue items={data.interventionQueue} />
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Program Value</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                <p className="text-sm">Gives agencies a ranked field response queue instead of scattered farmer reports.</p>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                <p className="text-sm">Connects disease risk to market pressure and subsidy programs for co-ops, NGOs, insurers, and governments.</p>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                <p className="text-sm">Creates a B2B/B2G dashboard layer on top of CropMind's farmer diagnosis flow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
