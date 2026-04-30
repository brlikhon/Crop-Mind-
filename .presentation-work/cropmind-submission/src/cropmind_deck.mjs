const {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  layers,
  panel,
  text,
  shape,
  chart,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  grow,
  fr,
  auto,
} = await import("@oai/artifact-tool");

const OUT = "../output/output.pptx";
const W = 1920;
const H = 1080;
const C = {
  ink: "#123026",
  muted: "#5C746A",
  canvas: "#F5F7EF",
  paper: "#FFFDF5",
  green: "#0F7A55",
  lime: "#B7E36A",
  clay: "#D56F3E",
  teal: "#0E8A8A",
  gold: "#D9A441",
  dark: "#071D18",
  line: "#D8E1D5",
  wash: "#EAF1E5",
};

const pres = Presentation.create({ slideSize: { width: W, height: H } });

function t(value, opts = {}) {
  return text(value, {
    width: opts.width ?? fill,
    height: opts.height ?? hug,
    columnSpan: opts.columnSpan,
    rowSpan: opts.rowSpan,
    name: opts.name,
    style: {
      fontSize: opts.size ?? 28,
      bold: opts.bold ?? false,
      color: opts.color ?? C.ink,
      italic: opts.italic ?? false,
      ...(opts.style ?? {}),
    },
  });
}

function metric(label, value, note, accent = C.green) {
  return column({ width: fill, height: hug, gap: 8 }, [
    t(value, { size: 50, bold: true, color: accent }),
    t(label, { size: 20, bold: true, color: C.ink }),
    t(note, { size: 16, color: C.muted, width: wrap(280) }),
  ]);
}

function tag(value, color = C.green) {
  return panel(
    { fill: "#FFFFFF", padding: { x: 16, y: 8 }, width: hug, height: hug },
    t(value, { size: 16, bold: true, color }),
  );
}

function slideRoot(children, bg = C.canvas) {
  return layers({ width: fill, height: fill }, [
    shape({ name: "background", width: fill, height: fill, fill: bg }),
    ...children,
  ]);
}

function add(slideName, root) {
  const slide = pres.slides.add();
  slide.compose(root, {
    frame: { left: 0, top: 0, width: W, height: H },
    baseUnit: 8,
  });
  slide.name = slideName;
  return slide;
}

function titleStack(title, subtitle, overline = "CropMind") {
  return column({ width: fill, height: hug, gap: 18 }, [
    row({ width: fill, height: hug, gap: 14, align: "center" }, [
      shape({ width: fixed(64), height: fixed(6), fill: C.lime }),
      t(overline, { size: 18, bold: true, color: C.green, width: hug }),
    ]),
    t(title, { size: 62, bold: true, width: wrap(1280), color: C.ink }),
    t(subtitle, { size: 25, width: wrap(1120), color: C.muted }),
  ]);
}

add(
  "Cover",
  slideRoot([
    grid(
      {
        width: fill,
        height: fill,
        columns: [fr(1.05), fr(0.95)],
        columnGap: 64,
        padding: { x: 92, y: 72 },
      },
      [
        column({ width: fill, height: fill, gap: 34, justify: "center" }, [
          row({ width: fill, height: hug, gap: 14, align: "center" }, [
            shape({ width: fixed(74), height: fixed(8), fill: C.lime }),
            t("Google Cloud Gen AI Academy APAC 2026", { size: 18, bold: true, color: C.green, width: hug }),
          ]),
          t("CropMind", { size: 112, bold: true, color: C.ink, width: fill }),
          t("From one farmer's symptom report to safer field action, regional intelligence, and measurable APAC impact.", {
            size: 31,
            color: C.muted,
            width: wrap(760),
          }),
        ]),
        layers({ width: fill, height: fill }, [
          shape({ width: fill, height: fill, fill: C.dark }),
          column({ width: fill, height: fill, padding: 54, justify: "between" }, [
            column({ width: fill, height: hug, gap: 12 }, [
              t("621,826", { size: 112, bold: true, color: C.lime }),
              t("hectares in active alert zones in the embedded APAC dataset", { size: 25, color: "#D6E8DE", width: wrap(620) }),
            ]),
            grid({ width: fill, height: hug, columns: [fr(1), fr(1)], columnGap: 24, rowGap: 24 }, [
              metric("active alerts", "34", "including 13 critical threats", C.lime),
              metric("market rows", "115", "prices used for business signals", C.lime),
              metric("crop types", "15", "across disease and market context", C.lime),
              metric("support programs", "13", "active subsidy paths surfaced", C.lime),
            ]),
          ]),
        ]),
      ],
    ),
  ]),
);

add(
  "Problem",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(0.75), fr(1.25)], columnGap: 70, padding: { x: 92, y: 74 } }, [
      titleStack("Agricultural advice breaks at the exact moment speed matters.", "Smallholders need safe treatment guidance, while officers need regional signal from many scattered reports.", "01 / Problem"),
      column({ width: fill, height: fill, gap: 38, justify: "center" }, [
        row({ width: fill, height: hug, gap: 24 }, [
          shape({ width: fixed(16), height: fixed(120), fill: C.clay }),
          column({ width: fill, height: hug, gap: 8 }, [
            t("Delayed diagnosis", { size: 34, bold: true }),
            t("Symptoms arrive in local language, images, and partial farmer context. Generic chatbots miss agronomy constraints.", { size: 22, color: C.muted, width: wrap(760) }),
          ]),
        ]),
        row({ width: fill, height: hug, gap: 24 }, [
          shape({ width: fixed(16), height: fixed(120), fill: C.gold }),
          column({ width: fill, height: hug, gap: 8 }, [
            t("Unsafe treatment choices", { size: 34, bold: true }),
            t("Advice must include timing, PPE, label approval, and escalation when a high-risk disease or chemical is involved.", { size: 22, color: C.muted, width: wrap(760) }),
          ]),
        ]),
        row({ width: fill, height: hug, gap: 24 }, [
          shape({ width: fixed(16), height: fixed(120), fill: C.teal }),
          column({ width: fill, height: hug, gap: 8 }, [
            t("No regional operating picture", { size: 34, bold: true }),
            t("Governments, co-ops, insurers, and NGOs need a field queue, not only isolated farmer answers.", { size: 22, color: C.muted, width: wrap(760) }),
          ]),
        ]),
      ]),
    ]),
  ]),
);

add(
  "Solution",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(1)], rows: [auto, fr(1)], rowGap: 52, padding: { x: 92, y: 70 } }, [
      titleStack("One workflow connects farmer advice to field response.", "CropMind uses specialized Gen AI agents, grounded tools, and outcome learning to serve both smallholders and agricultural institutions.", "02 / Solution"),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1), fr(1)], columnGap: 26 }, [
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [
          t("1", { size: 76, bold: true, color: C.green }),
          t("Farmer input", { size: 32, bold: true }),
          t("Voice, photo, and natural-language symptoms in the farmer's preferred language.", { size: 22, color: C.muted, width: wrap(360) }),
        ]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [
          t("2", { size: 76, bold: true, color: C.teal }),
          t("Agent reasoning", { size: 32, bold: true }),
          t("Disease, weather, market, and treatment agents produce traceable findings.", { size: 22, color: C.muted, width: wrap(360) }),
        ]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [
          t("3", { size: 76, bold: true, color: C.gold }),
          t("Action plan", { size: 32, bold: true }),
          t("Immediate steps, safety warnings, prevention, recovery timeline, and follow-up capture.", { size: 22, color: C.muted, width: wrap(360) }),
        ]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [
          t("4", { size: 76, bold: true, color: C.clay }),
          t("Officer intelligence", { size: 32, bold: true }),
          t("Regional risk scoring, subsidy matching, market pressure, and exportable field queues.", { size: 22, color: C.muted, width: wrap(360) }),
        ]),
      ]),
    ]),
  ]),
);

add(
  "Farmer Experience",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(0.9), fr(1.1)], columnGap: 70, padding: { x: 92, y: 70 } }, [
      titleStack("The farmer screen is built for real constraints.", "Sprint 1 and 2 turn diagnosis into a safe action plan that works in low-bandwidth, multilingual field settings.", "03 / Farmer"),
      column({ width: fill, height: fill, gap: 26, justify: "center" }, [
        row({ width: fill, height: hug, gap: 18 }, [tag("Multilingual"), tag("Voice"), tag("Low-data image"), tag("Follow-up")]),
        t("Farmer Action Plan", { size: 46, bold: true, color: C.green }),
        t("Do today: isolate symptoms, adjust irrigation, choose locally approved treatment, and check PPE before application.", { size: 29, width: wrap(800) }),
        rule({ width: fixed(520), stroke: C.line, weight: 2 }),
        grid({ width: fill, height: hug, columns: [fr(1), fr(1)], columnGap: 28, rowGap: 24 }, [
          metric("safety warnings", "PPE + label", "Treatment agent returns local approval caveats.", C.clay),
          metric("sources", "grounded", "Disease and treatment results carry source links.", C.teal),
          metric("timeline", "weeks", "Recovery window and escalation advice are visible.", C.gold),
          metric("learning loop", "case follow-up", "Resolved outcomes improve future recommendations.", C.green),
        ]),
      ]),
    ]),
  ]),
);

add(
  "Officer Dashboard",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(1)], rows: [auto, fr(1)], rowGap: 44, padding: { x: 92, y: 70 } }, [
      titleStack("The officer dashboard turns cases into regional action.", "Sprint 3 creates the B2G/B2B layer: intervention queue, risk map, market signal, and subsidy support.", "04 / Officer"),
      grid({ width: fill, height: fill, columns: [fr(1.2), fr(0.8)], columnGap: 50 }, [
        column({ width: fill, height: fill, gap: 26, justify: "center" }, [
          t("Regional Crop Risk Command Center", { size: 48, bold: true, color: C.ink }),
          grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], columnGap: 18, rowGap: 18 }, [
            metric("risk score", "0-100", "Severity, area, and crop spread", C.green),
            metric("field queue", "top 6", "Ranked export for field teams", C.clay),
            metric("support match", "subsidy", "Programs linked to crops and country", C.gold),
          ]),
          t("Business value: agencies and partners can prioritize scarce field capacity with an evidence-backed queue instead of scattered reports.", { size: 27, color: C.muted, width: wrap(1040) }),
        ]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [
          t("What the judge sees", { size: 30, bold: true, color: C.green }),
          t("1. Risk by region", { size: 25, bold: true }),
          t("2. Lead threat and affected hectares", { size: 25, bold: true }),
          t("3. Market pressure by crop", { size: 25, bold: true }),
          t("4. Eligible support programs", { size: 25, bold: true }),
          t("5. Exportable response queue", { size: 25, bold: true }),
        ]),
      ]),
    ]),
  ]),
);

add(
  "Impact Model",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(0.95), fr(1.05)], columnGap: 64, padding: { x: 92, y: 70 } }, [
      column({ width: fill, height: fill, gap: 30, justify: "center" }, [
        titleStack("Sprint 4 proves the business case.", "The impact console models farmer reach, value at risk, preventable loss, buyer segments, and trust controls.", "05 / Impact"),
        grid({ width: fill, height: hug, columns: [fr(1), fr(1)], columnGap: 22, rowGap: 22 }, [
          metric("affected area", "621,826 ha", "Embedded active alert zones", C.green),
          metric("countries", "8", "Alerts, markets, and subsidies", C.teal),
          metric("active programs", "13", "Support pathways surfaced", C.gold),
          metric("pilot model", "benefit/cost", "Exportable impact brief", C.clay),
        ]),
      ]),
      chart({
        name: "impact-bar-chart",
        chartType: "bar",
        width: fill,
        height: fill,
        config: {
          title: { text: "Impact evidence in the submission demo" },
          categories: ["Alerts", "Markets", "Subsidies", "Crops"],
          series: [{ name: "Count", values: [34, 115, 13, 15] }],
        },
      }),
    ]),
  ]),
);

add(
  "Architecture",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(1)], rows: [auto, fr(1)], rowGap: 44, padding: { x: 92, y: 70 } }, [
      titleStack("The architecture is made for Google Cloud Gen AI.", "A modular agent system grounds recommendations in data, sources, and outcome feedback.", "06 / Technical"),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1), fr(1), fr(1)], columnGap: 22 }, [
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [t("Vertex AI", { size: 36, bold: true, color: C.green }), t("Gemini reasoning and synthesis for farmer-facing recommendations.", { size: 21, color: C.muted })]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [t("ADK Agents", { size: 36, bold: true, color: C.teal }), t("Disease, weather, market, and treatment specialists with traces.", { size: 21, color: C.muted })]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [t("MCP Tools", { size: 36, bold: true, color: C.gold }), t("Weather, crop alerts, market prices, and subsidy registries.", { size: 21, color: C.muted })]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [t("Grounding", { size: 36, bold: true, color: C.clay }), t("Google Search sources and safety-aware treatment output.", { size: 21, color: C.muted })]),
        column({ width: fill, height: fill, gap: 18, justify: "center" }, [t("Case Memory", { size: 36, bold: true, color: C.green }), t("Follow-up outcomes feed historical case intelligence.", { size: 21, color: C.muted })]),
      ]),
    ]),
  ]),
);

add(
  "Trust",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(0.9), fr(1.1)], columnGap: 66, padding: { x: 92, y: 70 } }, [
      titleStack("Trust is designed into the workflow.", "CropMind does not stop at fluent text. It makes safety, evidence, and human escalation visible.", "07 / Safety"),
      column({ width: fill, height: fill, gap: 32, justify: "center" }, [
        row({ width: fill, height: hug, gap: 18 }, [shape({ width: fixed(28), height: fixed(28), fill: C.green }), t("Grounded source links for disease and treatment agents", { size: 30, bold: true })]),
        row({ width: fill, height: hug, gap: 18 }, [shape({ width: fixed(28), height: fixed(28), fill: C.clay }), t("PPE, timing, local label, and escalation warnings", { size: 30, bold: true })]),
        row({ width: fill, height: hug, gap: 18 }, [shape({ width: fixed(28), height: fixed(28), fill: C.gold }), t("Follow-up tracker closes the farmer outcome loop", { size: 30, bold: true })]),
        row({ width: fill, height: hug, gap: 18 }, [shape({ width: fixed(28), height: fixed(28), fill: C.teal }), t("Officer queue keeps high-risk issues human-supervised", { size: 30, bold: true })]),
      ]),
    ]),
  ]),
);

add(
  "Sprint Proof",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(1)], rows: [auto, fr(1)], rowGap: 38, padding: { x: 92, y: 70 } }, [
      titleStack("Five sprints moved CropMind from prototype to submission story.", "Each sprint adds a judge-visible reason to believe: usefulness, accessibility, operational scale, business viability, and demo clarity.", "08 / Build Proof"),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1), fr(1), fr(1)], columnGap: 18 }, [
        column({ width: fill, height: fill, gap: 16, justify: "center" }, [t("S1", { size: 64, bold: true, color: C.green }), t("Farmer action plan", { size: 27, bold: true }), t("Safety, cost, timeline, sources, follow-up.", { size: 20, color: C.muted })]),
        column({ width: fill, height: fill, gap: 16, justify: "center" }, [t("S2", { size: 64, bold: true, color: C.teal }), t("Access layer", { size: 27, bold: true }), t("Multilingual, voice, low-data image upload.", { size: 20, color: C.muted })]),
        column({ width: fill, height: fill, gap: 16, justify: "center" }, [t("S3", { size: 64, bold: true, color: C.gold }), t("Officer dashboard", { size: 27, bold: true }), t("Risk map, field queue, market, subsidy.", { size: 20, color: C.muted })]),
        column({ width: fill, height: fill, gap: 16, justify: "center" }, [t("S4", { size: 64, bold: true, color: C.clay }), t("Impact model", { size: 27, bold: true }), t("ROI, buyer use cases, proof plan.", { size: 20, color: C.muted })]),
        column({ width: fill, height: fill, gap: 16, justify: "center" }, [t("S5", { size: 64, bold: true, color: C.green }), t("Judge demo room", { size: 27, bold: true }), t("Run of show, sample prompts, export brief.", { size: 20, color: C.muted })]),
      ]),
    ]),
  ]),
);

add(
  "Demo Flow",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(0.85), fr(1.15)], columnGap: 70, padding: { x: 92, y: 70 } }, [
      titleStack("Lead judges through the product, not a feature list.", "The /demo route gives a five-minute run of show with copyable prompts and the exact proof order.", "09 / Demo"),
      column({ width: fill, height: fill, gap: 26, justify: "center" }, [
        t("1. Impact", { size: 36, bold: true, color: C.green }),
        t("2. Farmer diagnosis", { size: 36, bold: true, color: C.teal }),
        t("3. Follow-up learning", { size: 36, bold: true, color: C.gold }),
        t("4. Officer command center", { size: 36, bold: true, color: C.clay }),
        t("5. Architecture", { size: 36, bold: true, color: C.green }),
        t("6. Pilot ask", { size: 36, bold: true, color: C.teal }),
        rule({ width: fixed(540), stroke: C.line, weight: 2 }),
        t("The strongest live path starts at /demo, moves to /impact, then proves the farmer and officer workflows.", { size: 28, color: C.muted, width: wrap(780) }),
      ]),
    ]),
  ]),
);

add(
  "Closing",
  slideRoot([
    grid({ width: fill, height: fill, columns: [fr(1.1), fr(0.9)], columnGap: 80, padding: { x: 92, y: 70 } }, [
      column({ width: fill, height: fill, gap: 28, justify: "center" }, [
        t("CropMind is ready for a district pilot.", { size: 72, bold: true, color: C.ink, width: wrap(980) }),
        t("The next step is a launch partner with extension officers, co-ops, or insurers to validate treatment speed, outcome capture, and subsidy linkage.", { size: 30, color: C.muted, width: wrap(920) }),
      ]),
      column({ width: fill, height: fill, gap: 28, justify: "center" }, [
        metric("pilot geography", "3 regions", "Start where active alerts are highest", C.green),
        metric("pilot cases", "300", "Farmer sessions in first week", C.teal),
        metric("success target", "<48h", "Symptom report to treatment action", C.clay),
      ]),
    ]),
  ], C.paper),
);

const blob = await PresentationFile.exportPptx(pres);
await blob.save(OUT);
console.log(`saved ${OUT}`);
