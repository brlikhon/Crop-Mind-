import { Router, type IRouter } from "express";
import alertsData from "../data/crop-alerts.json" with { type: "json" };
import pricesData from "../data/market-prices.json" with { type: "json" };
import subsidiesData from "../data/subsidies.json" with { type: "json" };

const router: IRouter = Router();

type DemoStatus = "ready" | "watch" | "next";

interface CropAlert {
  cropType: string;
  country: string;
  severity: "low" | "medium" | "high" | "critical";
  isActive: boolean;
}

interface MarketPrice {
  cropType: string;
  country: string;
}

interface Subsidy {
  country: string;
  isActive: boolean;
}

const alerts = alertsData as CropAlert[];
const prices = pricesData as MarketPrice[];
const subsidies = subsidiesData as Subsidy[];

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function buildDemoBrief() {
  const activeAlerts = alerts.filter((alert) => alert.isActive);
  const criticalAlerts = activeAlerts.filter((alert) => alert.severity === "critical");
  const countriesCovered = unique([
    ...activeAlerts.map((alert) => alert.country),
    ...prices.map((price) => price.country),
    ...subsidies.map((subsidy) => subsidy.country),
  ]);
  const cropTypes = unique([
    ...activeAlerts.map((alert) => alert.cropType),
    ...prices.map((price) => price.cropType),
  ]);
  const activeSubsidies = subsidies.filter((subsidy) => subsidy.isActive);

  return {
    generatedAt: new Date().toISOString(),
    headline: "CropMind turns a farmer symptom report into field action, regional intelligence, and measurable APAC impact.",
    demoRuntimeMinutes: 5,
    dataFootprint: {
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      countriesCovered: countriesCovered.length,
      cropTypes: cropTypes.length,
      marketRows: prices.length,
      activeSubsidyPrograms: activeSubsidies.length,
    },
    openingHook:
      "A farmer needs safe advice now, but a ministry also needs to know where the next outbreak is spreading. CropMind connects both sides in one Google Cloud AI workflow.",
    demoFlow: [
      {
        step: 1,
        title: "Open with measurable impact",
        route: "/impact",
        durationSeconds: 45,
        narration: "Show value at risk, preventable loss, pilot benefit/cost ratio, and buyer segments.",
        judgeSignal: "This is not a toy demo. It has a social impact case and a business path.",
      },
      {
        step: 2,
        title: "Run farmer diagnosis",
        route: "/",
        durationSeconds: 90,
        narration: "Use a sample farmer prompt, choose a local language, and show the farmer action plan.",
        judgeSignal: "The system supports smallholders with practical, safe, localized guidance.",
      },
      {
        step: 3,
        title: "Show learning loop",
        route: "/",
        durationSeconds: 35,
        narration: "Point to follow-up capture and case submission that improves future recommendations.",
        judgeSignal: "The product can learn from outcomes instead of ending at a chatbot response.",
      },
      {
        step: 4,
        title: "Switch to officer command",
        route: "/officer",
        durationSeconds: 70,
        narration: "Show regional risk scoring, subsidy matching, market pressure, and exportable field queue.",
        judgeSignal: "CropMind scales from one farmer to an APAC crop intelligence network.",
      },
      {
        step: 5,
        title: "Prove technical depth",
        route: "/architecture",
        durationSeconds: 45,
        narration: "Connect Vertex AI, ADK agents, MCP tools, Google Search grounding, and vector case intelligence.",
        judgeSignal: "The solution uses Google Cloud Gen AI components with a real architecture.",
      },
      {
        step: 6,
        title: "Close with the ask",
        route: "/impact",
        durationSeconds: 15,
        narration: "Ask for a district pilot with extension officers, co-ops, or crop insurers.",
        judgeSignal: "The project has a next step beyond the hackathon submission.",
      },
    ],
    sampleCases: [
      {
        id: "rice-blast-bangladesh",
        title: "Rice disease under humid weather",
        persona: "Smallholder rice farmer in Bangladesh",
        preferredLanguage: "Bangla",
        query:
          "My rice leaves in Rangpur have diamond shaped grey spots with brown edges after a humid week. What should I do today?",
        expectedEvidence: [
          "Disease agent identifies likely blast and differentials.",
          "Weather agent explains humidity risk.",
          "Treatment agent gives immediate actions and safety warnings.",
          "Farmer action plan shows today, prevention, follow-up, and sources.",
        ],
      },
      {
        id: "banana-wilt-philippines",
        title: "Banana wilt with escalation",
        persona: "Banana grower cooperative in Philippines",
        preferredLanguage: "English",
        query:
          "Banana plants near Davao are yellowing and wilting from one side. The lower stem has brown streaks. Is this serious?",
        expectedEvidence: [
          "High-risk diagnosis triggers clear escalation advice.",
          "Officer dashboard connects regional threat to field response.",
          "Business case supports co-op deployment.",
        ],
      },
      {
        id: "cotton-leaf-curl-india",
        title: "Cotton virus with subsidy support",
        persona: "Cotton farmer in India",
        preferredLanguage: "Hindi",
        query:
          "My cotton crop in Punjab has curled leaves, yellow veins, and whiteflies. I need low cost advice before spraying.",
        expectedEvidence: [
          "Advice separates vector control from disease cure claims.",
          "Market and subsidy signals make the recommendation economically useful.",
          "Safety warnings reduce risky pesticide behavior.",
        ],
      },
    ],
    proofPillars: [
      {
        pillar: "Impact",
        route: "/impact",
        evidence: "Models farmer reach, crop value at risk, preventable loss, and a pilot benefit/cost ratio from APAC data.",
      },
      {
        pillar: "Technical execution",
        route: "/architecture",
        evidence: "Shows multi-agent orchestration, MCP tools, grounding, streaming traces, and case intelligence.",
      },
      {
        pillar: "User usefulness",
        route: "/",
        evidence: "Supports image-aware diagnosis, low-data upload, voice input, multilingual responses, and follow-up tracking.",
      },
      {
        pillar: "Operational scale",
        route: "/officer",
        evidence: "Ranks field interventions by region, threat, market pressure, affected area, and support programs.",
      },
      {
        pillar: "Business viability",
        route: "/impact",
        evidence: "Defines government, co-op, insurer, lender, NGO, and input-network buyer motions.",
      },
    ],
    technicalHighlights: [
      {
        track: "Google Cloud Gen AI",
        evidence: "Vertex AI Gemini agents synthesize farmer recommendations and resolve cross-agent conflicts.",
      },
      {
        track: "ADK multi-agent architecture",
        evidence: "Specialized disease, weather, market, and treatment agents produce traceable findings.",
      },
      {
        track: "MCP tool layer",
        evidence: "Weather, crop alert, market price, and subsidy tools are exposed through a standards-based tool boundary.",
      },
      {
        track: "Grounding and trust",
        evidence: "Disease and treatment flows include source links, safety warnings, and local approval caveats.",
      },
      {
        track: "Outcome intelligence",
        evidence: "Resolved cases can feed similarity search and improve future advice.",
      },
    ],
    launchReadiness: [
      {
        area: "Farmer demo flow",
        status: "ready" as DemoStatus,
        evidence: "Diagnosis, language selection, low-data image handling, action plan, and follow-up capture are implemented.",
      },
      {
        area: "Officer workflow",
        status: "ready" as DemoStatus,
        evidence: "Regional risk map, field queue, market signal, subsidy matching, and CSV export are implemented.",
      },
      {
        area: "Business case",
        status: "ready" as DemoStatus,
        evidence: "Impact dashboard quantifies value at risk, preventable loss, and buyer use cases.",
      },
      {
        area: "Production verification",
        status: "watch" as DemoStatus,
        evidence: "Full build/typecheck should be rerun in an unrestricted Windows shell before final submission.",
      },
      {
        area: "Clinical agronomy review",
        status: "next" as DemoStatus,
        evidence: "Add a certified agronomist approval workflow for restricted chemical recommendations before live deployment.",
      },
    ],
    closingScript:
      "CropMind is the APAC agricultural intelligence network that starts with one farmer's symptom report and ends with safer action, field prioritization, and measurable value for governments and partners.",
    submissionChecklist: [
      "Open /impact first and state the modeled farmer/business value.",
      "Run one multilingual farmer diagnosis from the sample cases.",
      "Show the officer queue and export action list.",
      "Show architecture only after judges understand the impact.",
      "Close with a pilot ask and the trust-readiness controls.",
    ],
  };
}

router.get("/demo/brief", (_req, res) => {
  res.json(buildDemoBrief());
});

export default router;
