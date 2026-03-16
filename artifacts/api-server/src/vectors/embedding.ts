const DIMENSIONS = 768;

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
  const vec = new Float64Array(DIMENSIONS);

  const words = normalized.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const wordSeed = hashCode(word);
    const rng = mulberry32(wordSeed);
    for (let d = 0; d < DIMENSIONS; d++) {
      vec[d] += rng() * 2 - 1;
    }
  }

  const trigrams: string[] = [];
  for (let i = 0; i < normalized.length - 2; i++) {
    trigrams.push(normalized.substring(i, i + 3));
  }
  for (const trigram of trigrams) {
    const triSeed = hashCode(trigram);
    const idx = Math.abs(triSeed) % DIMENSIONS;
    vec[idx] += 0.5;
  }

  let magnitude = 0;
  for (let d = 0; d < DIMENSIONS; d++) {
    magnitude += vec[d] * vec[d];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    const fallbackRng = mulberry32(hashCode(text));
    const result: number[] = [];
    let m2 = 0;
    for (let d = 0; d < DIMENSIONS; d++) {
      result[d] = fallbackRng() * 2 - 1;
      m2 += result[d] * result[d];
    }
    m2 = Math.sqrt(m2);
    return result.map((v) => v / m2);
  }

  const result: number[] = [];
  for (let d = 0; d < DIMENSIONS; d++) {
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

export const EMBEDDING_DIMENSIONS = DIMENSIONS;
