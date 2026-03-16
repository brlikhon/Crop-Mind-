import { Router, type Request, type Response } from "express";
import { searchSimilarCases, submitCase } from "../vectors/search.js";

const casesRouter = Router();

casesRouter.post("/cases/search", async (req: Request, res: Response) => {
  const { symptomsDescription, cropType, country, topK } = req.body ?? {};

  if (typeof symptomsDescription !== "string" || !symptomsDescription.trim()) {
    res.status(400).json({ error: "Missing required field 'symptomsDescription'." });
    return;
  }

  try {
    const result = await searchSimilarCases({
      symptomsDescription: symptomsDescription.trim(),
      cropType: typeof cropType === "string" ? cropType.trim() : undefined,
      country: typeof country === "string" ? country.trim() : undefined,
      topK: typeof topK === "number" && topK > 0 ? Math.min(topK, 20) : 5,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

casesRouter.post("/cases/submit", async (req: Request, res: Response) => {
  const { cropType, country, region, symptomsText, diagnosis, treatmentApplied, outcomeScore } = req.body ?? {};

  const missing: string[] = [];
  if (typeof cropType !== "string" || !cropType.trim()) missing.push("cropType");
  if (typeof country !== "string" || !country.trim()) missing.push("country");
  if (typeof region !== "string" || !region.trim()) missing.push("region");
  if (typeof symptomsText !== "string" || !symptomsText.trim()) missing.push("symptomsText");
  if (typeof diagnosis !== "string" || !diagnosis.trim()) missing.push("diagnosis");
  if (typeof treatmentApplied !== "string" || !treatmentApplied.trim()) missing.push("treatmentApplied");
  if (typeof outcomeScore !== "number" || Number.isNaN(outcomeScore) || outcomeScore < 0 || outcomeScore > 1) missing.push("outcomeScore (0.0-1.0)");

  if (missing.length > 0) {
    res.status(400).json({ error: `Missing or invalid required fields: ${missing.join(", ")}` });
    return;
  }

  try {
    const result = await submitCase({
      cropType: cropType.trim(),
      country: country.trim(),
      region: region.trim(),
      symptomsText: symptomsText.trim(),
      diagnosis: diagnosis.trim(),
      treatmentApplied: treatmentApplied.trim(),
      outcomeScore,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default casesRouter;
