import { Router, type IRouter } from "express";
import alertsData from "../data/crop-alerts.json" with { type: "json" };
import pricesData from "../data/market-prices.json" with { type: "json" };
import subsidiesData from "../data/subsidies.json" with { type: "json" };

const router: IRouter = Router();

type Severity = "low" | "medium" | "high" | "critical";

interface CropAlert {
  alertId: string;
  cropType: string;
  region: string;
  country: string;
  threatType: string;
  threatName: string;
  severity: Severity;
  description: string;
  advisoryText: string;
  affectedAreaHa: number | null;
  reportedDate: string;
  expiresDate: string | null;
  isActive: boolean;
  source: string | null;
}

interface MarketPrice {
  cropType: string;
  country: string;
  market: string;
  priceUsdPerKg: number;
  priceChange7d: number | null;
  priceChange30d: number | null;
  weekOf: string;
}

interface Subsidy {
  programId: string;
  programName: string;
  country: string;
  eligibleCrops: string;
  benefitType: string;
  maxBenefitUsd: number | null;
  isActive: boolean;
  applicationDeadline: string | null;
}

interface RegionAccumulator {
  id: string;
  region: string;
  country: string;
  alertCount: number;
  affectedAreaHa: number;
  severityCounts: Record<Severity, number>;
  crops: Set<string>;
  threats: Set<string>;
  alerts: CropAlert[];
}

const alerts = alertsData as CropAlert[];
const prices = pricesData as MarketPrice[];
const subsidies = subsidiesData as Subsidy[];

const severityWeight: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function riskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function riskScore(region: RegionAccumulator): number {
  const severityScore = Object.entries(region.severityCounts).reduce(
    (sum, [severity, count]) => sum + severityWeight[severity as Severity] * count * 11,
    0,
  );
  const spreadScore = Math.min(region.affectedAreaHa / 900, 32);
  const cropDiversityScore = Math.min(region.crops.size * 4, 16);
  return Math.min(100, Math.round(severityScore + spreadScore + cropDiversityScore));
}

function marketPressureFor(country: string, crop: string) {
  const matches = prices.filter(
    (price) =>
      price.country.toLowerCase() === country.toLowerCase() &&
      price.cropType.toLowerCase() === crop.toLowerCase(),
  );

  if (matches.length === 0) {
    return {
      marketsTracked: 0,
      avgUsdPerKg: null,
      avgChange7d: null,
      avgChange30d: null,
      pressure: "unknown" as const,
    };
  }

  const avg = (values: number[]) =>
    values.length > 0 ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100 : null;

  const avgChange7d = avg(matches.map((price) => price.priceChange7d).filter((value): value is number => typeof value === "number"));
  const avgChange30d = avg(matches.map((price) => price.priceChange30d).filter((value): value is number => typeof value === "number"));
  const avgUsdPerKg = avg(matches.map((price) => price.priceUsdPerKg));

  const trend = avgChange30d ?? avgChange7d ?? 0;
  return {
    marketsTracked: matches.length,
    avgUsdPerKg,
    avgChange7d,
    avgChange30d,
    pressure: trend <= -5 ? "falling" as const : trend >= 5 ? "rising" as const : "stable" as const,
  };
}

function activeSubsidiesFor(country: string, crops: string[]) {
  return subsidies
    .filter((program) => program.isActive && program.country.toLowerCase() === country.toLowerCase())
    .filter((program) => {
      const eligible = program.eligibleCrops.toLowerCase();
      return eligible === "all crops" || crops.some((crop) => eligible.includes(crop.toLowerCase()));
    })
    .sort((a, b) => (b.maxBenefitUsd ?? 0) - (a.maxBenefitUsd ?? 0))
    .slice(0, 3)
    .map((program) => ({
      programId: program.programId,
      programName: program.programName,
      benefitType: program.benefitType,
      maxBenefitUsd: program.maxBenefitUsd,
      applicationDeadline: program.applicationDeadline,
    }));
}

function buildOverview() {
  const activeAlerts = alerts.filter((alert) => alert.isActive);
  const regions = new Map<string, RegionAccumulator>();

  for (const alert of activeAlerts) {
    const id = `${alert.country}:${alert.region}`.toLowerCase();
    const existing = regions.get(id) ?? {
      id,
      region: alert.region,
      country: alert.country,
      alertCount: 0,
      affectedAreaHa: 0,
      severityCounts: { low: 0, medium: 0, high: 0, critical: 0 },
      crops: new Set<string>(),
      threats: new Set<string>(),
      alerts: [],
    };

    existing.alertCount += 1;
    existing.affectedAreaHa += alert.affectedAreaHa ?? 0;
    existing.severityCounts[alert.severity] += 1;
    existing.crops.add(alert.cropType);
    existing.threats.add(alert.threatName);
    existing.alerts.push(alert);
    regions.set(id, existing);
  }

  const regionSummaries = [...regions.values()]
    .map((region) => {
      const score = riskScore(region);
      const crops = [...region.crops].sort();
      const mostSevereAlert = [...region.alerts].sort(
        (a, b) => severityWeight[b.severity] - severityWeight[a.severity] || (b.affectedAreaHa ?? 0) - (a.affectedAreaHa ?? 0),
      )[0];
      const marketSignals = crops.map((crop) => ({
        cropType: crop,
        ...marketPressureFor(region.country, crop),
      }));

      return {
        id: region.id,
        region: region.region,
        country: region.country,
        riskScore: score,
        riskLevel: riskLevel(score),
        alertCount: region.alertCount,
        affectedAreaHa: Math.round(region.affectedAreaHa),
        severityCounts: region.severityCounts,
        crops,
        topThreats: [...region.threats].slice(0, 4),
        priorityAction: mostSevereAlert?.advisoryText ?? "Monitor and collect new field reports.",
        leadThreat: mostSevereAlert
          ? {
              alertId: mostSevereAlert.alertId,
              cropType: mostSevereAlert.cropType,
              threatName: mostSevereAlert.threatName,
              threatType: mostSevereAlert.threatType,
              severity: mostSevereAlert.severity,
              source: mostSevereAlert.source,
            }
          : null,
        marketSignals,
        subsidyPrograms: activeSubsidiesFor(region.country, crops),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const countrySummaries = [...new Set(activeAlerts.map((alert) => alert.country))]
    .map((country) => {
      const countryRegions = regionSummaries.filter((region) => region.country === country);
      const countryAlerts = activeAlerts.filter((alert) => alert.country === country);
      return {
        country,
        alertCount: countryAlerts.length,
        criticalAlerts: countryAlerts.filter((alert) => alert.severity === "critical").length,
        affectedAreaHa: Math.round(countryAlerts.reduce((sum, alert) => sum + (alert.affectedAreaHa ?? 0), 0)),
        highestRiskScore: Math.max(...countryRegions.map((region) => region.riskScore)),
        activeSubsidyPrograms: subsidies.filter((program) => program.isActive && program.country === country).length,
      };
    })
    .sort((a, b) => b.highestRiskScore - a.highestRiskScore);

  const interventionQueue = regionSummaries.slice(0, 6).map((region, index) => ({
    rank: index + 1,
    region: region.region,
    country: region.country,
    riskLevel: region.riskLevel,
    riskScore: region.riskScore,
    affectedAreaHa: region.affectedAreaHa,
    leadThreat: region.leadThreat,
    action: region.priorityAction,
  }));

  const totalAffectedAreaHa = Math.round(activeAlerts.reduce((sum, alert) => sum + (alert.affectedAreaHa ?? 0), 0));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      activeAlerts: activeAlerts.length,
      countriesCovered: countrySummaries.length,
      regionsAtRisk: regionSummaries.length,
      criticalRegions: regionSummaries.filter((region) => region.riskLevel === "critical").length,
      totalAffectedAreaHa,
      activeSubsidyPrograms: subsidies.filter((program) => program.isActive).length,
      marketsTracked: prices.length,
    },
    countries: countrySummaries,
    regions: regionSummaries,
    interventionQueue,
  };
}

router.get("/intelligence/overview", (_req, res) => {
  res.json(buildOverview());
});

export default router;
