import { generateEmbedding as generateVertexEmbedding } from "@workspace/integrations-google-vertex-ai-server";

export const EMBEDDING_DIMENSIONS = 768; // gemini-embedding-001 with MRL outputDimensionality=768

const EMBEDDING_MODEL = "gemini-embedding-001";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

const STRICT_AI_MODE = process.env.EMBEDDING_STRICT_AI === "true";

let _embeddingsApiAvailable: boolean | null = null;
let _embeddingMode: "ai" | "deterministic" = "deterministic";

export function getEmbeddingMode(): "ai" | "deterministic" {
  return _embeddingMode;
}

async function checkEmbeddingsApi(): Promise<boolean> {
  if (_embeddingsApiAvailable !== null) return _embeddingsApiAvailable;
  try {
    const embedding = await generateVertexEmbedding("probe");
    if (embedding.length > 0) {
      _embeddingsApiAvailable = true;
      _embeddingMode = "ai";
      console.log(`[embedding] Vertex AI embeddings API available (${EMBEDDING_MODEL}, dim=${embedding.length})`);
      return true;
    }
  } catch (err) {
    _embeddingsApiAvailable = false;
    _embeddingMode = "deterministic";
    if (STRICT_AI_MODE) {
      throw new Error(
        `[embedding] FATAL: Vertex AI embeddings API not available and EMBEDDING_STRICT_AI=true. ` +
        `Ensure GOOGLE_CLOUD_PROJECT and credentials are configured. ` +
        `Set EMBEDDING_STRICT_AI=false to use deterministic fallback.`
      );
    }
    console.warn(
      `[embedding] Vertex AI embeddings API unavailable: ${err instanceof Error ? err.message : String(err)}. ` +
      `Using deterministic text-hash embeddings (word + trigram → ${EMBEDDING_DIMENSIONS}-dim). ` +
      `Set EMBEDDING_STRICT_AI=true to enforce AI-only mode and fail on unavailability.`
    );
  }
  return false;
}

async function callEmbeddingsApiWithRetry(text: string): Promise<number[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await generateVertexEmbedding(text);
    } catch (err: unknown) {
      lastError = err;
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      const jitter = Math.random() * backoff * 0.1;
      console.log(`[embedding] Retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(backoff + jitter)}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
    }
  }
  throw new Error(`[embedding] Exhausted ${MAX_RETRIES} retries for embeddings API: ${(lastError as Error).message}`);
}

export async function generateEmbeddingAsync(text: string): Promise<number[]> {
  const apiAvailable = await checkEmbeddingsApi();
  if (apiAvailable) {
    const result = await callEmbeddingsApiWithRetry(text);
    if (result.length === EMBEDDING_DIMENSIONS) return result;
    return padOrTruncate(result, EMBEDDING_DIMENSIONS);
  }
  return generateEmbedding(text);
}

function padOrTruncate(vec: number[], dim: number): number[] {
  if (vec.length === dim) return vec;
  if (vec.length > dim) return vec.slice(0, dim);
  const padded = new Array(dim).fill(0);
  for (let i = 0; i < vec.length; i++) padded[i] = vec[i];
  return padded;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const vec = new Float64Array(EMBEDDING_DIMENSIONS);

  const words = normalized.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const wordSeed = hashCode(word);
    const rng = mulberry32(wordSeed);
    for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
      vec[d] += rng() * 2 - 1;
    }
  }

  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.substring(i, i + 3);
    const triSeed = hashCode(trigram);
    const idx = Math.abs(triSeed) % EMBEDDING_DIMENSIONS;
    vec[idx] += 0.5;
  }

  let magnitude = 0;
  for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
    magnitude += vec[d] * vec[d];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    const fallbackRng = mulberry32(hashCode(text));
    const result: number[] = [];
    let m2 = 0;
    for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
      result[d] = fallbackRng() * 2 - 1;
      m2 += result[d] * result[d];
    }
    m2 = Math.sqrt(m2);
    return result.map((v) => v / m2);
  }

  const result: number[] = [];
  for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
    result[d] = vec[d] / magnitude;
  }
  return result;
}

export function buildCaseText(fields: {
  cropType: string;
  country: string;
  region: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
}): string {
  return `crop: ${fields.cropType}. region: ${fields.region}, ${fields.country}. symptoms: ${fields.symptoms}. diagnosis: ${fields.diagnosis}. treatment: ${fields.treatment}`;
}
