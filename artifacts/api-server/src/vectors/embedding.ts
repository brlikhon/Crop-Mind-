import { openai } from "@workspace/integrations-openai-ai-server";

export const EMBEDDING_DIMENSIONS = 1536;

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

let _embeddingsApiAvailable: boolean | null = null;

async function checkEmbeddingsApi(): Promise<boolean> {
  if (_embeddingsApiAvailable !== null) return _embeddingsApiAvailable;
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: "probe",
    });
    if (response.data?.[0]?.embedding?.length > 0) {
      _embeddingsApiAvailable = true;
      console.log(`[embedding] OpenAI embeddings API available (${EMBEDDING_MODEL}, dim=${response.data[0].embedding.length})`);
      return true;
    }
  } catch {
    _embeddingsApiAvailable = false;
    console.log(`[embedding] OpenAI embeddings API not available — using deterministic text-hash embeddings`);
  }
  return false;
}

async function callEmbeddingsApiWithRetry(text: string): Promise<number[] | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 || (status !== undefined && status >= 500)) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        const jitter = Math.random() * backoff * 0.1;
        console.log(`[embedding] Retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(backoff + jitter)}ms (status ${status})`);
        await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function generateEmbeddingAsync(text: string): Promise<number[]> {
  const apiAvailable = await checkEmbeddingsApi();
  if (apiAvailable) {
    const result = await callEmbeddingsApiWithRetry(text);
    if (result) {
      if (result.length === EMBEDDING_DIMENSIONS) return result;
      return padOrTruncate(result, EMBEDDING_DIMENSIONS);
    }
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
