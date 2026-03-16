import { pool } from "@workspace/db";
import { generateEmbeddingAsync, buildCaseText } from "./embedding.js";

export interface CaseSearchParams {
  symptomsDescription: string;
  cropType?: string;
  country?: string;
  topK?: number;
}

export interface SimilarCase {
  caseId: string;
  cropType: string;
  country: string;
  region: string;
  symptomsText: string;
  diagnosis: string;
  treatmentApplied: string;
  outcomeScore: number;
  resolvedAt: string;
  similarityScore: number;
  weightedScore: number;
}

export interface CaseSearchResult {
  query: string;
  filters: { cropType?: string; country?: string };
  candidatesFound: number;
  results: SimilarCase[];
  durationMs: number;
}

export async function searchSimilarCases(params: CaseSearchParams): Promise<CaseSearchResult> {
  const start = Date.now();
  const { symptomsDescription, cropType, country, topK = 5 } = params;

  const queryEmbedding = await generateEmbeddingAsync(symptomsDescription);
  const vecStr = `[${queryEmbedding.join(",")}]`;

  const conditions: string[] = [];
  const values: unknown[] = [vecStr];
  let paramIdx = 2;

  if (cropType) {
    conditions.push(`LOWER(crop_type) = LOWER($${paramIdx})`);
    values.push(cropType);
    paramIdx++;
  }
  if (country) {
    conditions.push(`LOWER(country) LIKE LOWER($${paramIdx})`);
    values.push(`%${country}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const candidateLimit = Math.max(topK * 2, 10);

  const sql = `
    SELECT
      case_id, crop_type, country, region, symptoms_text,
      diagnosis, treatment_applied, outcome_score, resolved_at,
      1 - (embedding <=> $1::vector) AS similarity_score
    FROM crop_cases
    ${whereClause}
    ORDER BY embedding <=> $1::vector
    LIMIT ${candidateLimit}
  `;

  const client = await pool.connect();
  try {
    const result = await client.query(sql, values);

    const candidates = result.rows.map((row) => ({
      caseId: row.case_id as string,
      cropType: row.crop_type as string,
      country: row.country as string,
      region: row.region as string,
      symptomsText: row.symptoms_text as string,
      diagnosis: row.diagnosis as string,
      treatmentApplied: row.treatment_applied as string,
      outcomeScore: parseFloat(row.outcome_score),
      resolvedAt: (row.resolved_at as Date).toISOString(),
      similarityScore: Math.round(parseFloat(row.similarity_score) * 10000) / 10000,
      weightedScore: 0,
    }));

    const SIMILARITY_WEIGHT = 0.6;
    const OUTCOME_WEIGHT = 0.4;

    for (const c of candidates) {
      c.weightedScore = Math.round(
        (c.similarityScore * SIMILARITY_WEIGHT + c.outcomeScore * OUTCOME_WEIGHT) * 10000
      ) / 10000;
    }

    candidates.sort((a, b) => b.weightedScore - a.weightedScore);

    const finalResults = candidates.slice(0, topK);

    return {
      query: symptomsDescription,
      filters: { cropType, country },
      candidatesFound: candidates.length,
      results: finalResults,
      durationMs: Date.now() - start,
    };
  } finally {
    client.release();
  }
}

export interface CaseSubmission {
  cropType: string;
  country: string;
  region: string;
  symptomsText: string;
  diagnosis: string;
  treatmentApplied: string;
  outcomeScore: number;
}

export interface CaseSubmitResult {
  caseId: string;
  success: boolean;
  message: string;
}

export async function submitCase(submission: CaseSubmission): Promise<CaseSubmitResult> {
  const caseId = `CASE-USR-${Date.now().toString(36).toUpperCase()}`;

  const caseText = buildCaseText({
    cropType: submission.cropType,
    country: submission.country,
    region: submission.region,
    symptoms: submission.symptomsText,
    diagnosis: submission.diagnosis,
    treatment: submission.treatmentApplied,
  });

  const embedding = await generateEmbeddingAsync(caseText);
  const vecStr = `[${embedding.join(",")}]`;

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO crop_cases (case_id, crop_type, country, region, symptoms_text, diagnosis, treatment_applied, outcome_score, resolved_at, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
      [caseId, submission.cropType, submission.country, submission.region, submission.symptomsText, submission.diagnosis, submission.treatmentApplied, submission.outcomeScore, vecStr]
    );

    return {
      caseId,
      success: true,
      message: `Case ${caseId} added to vector store. It will improve future recommendations for similar situations.`,
    };
  } finally {
    client.release();
  }
}
