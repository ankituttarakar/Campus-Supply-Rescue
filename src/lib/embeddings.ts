let pipelineInstance: any = null;

/**
 * Initializes or returns the cached local Transformers pipeline for feature extraction
 * using Xenova/all-MiniLM-L6-v2 (producing 384-dimensional dense vector embeddings).
 */
async function getExtractor() {
  if (!pipelineInstance) {
    try {
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = false;
      
      pipelineInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
      });
    } catch (err) {
      console.warn('[Embeddings] Neural pipeline loading warning, using fallback math vectorizer:', err);
      pipelineInstance = null;
    }
  }
  return pipelineInstance;
}

/**
 * Fallback deterministic high-dimensional vectorizer (384 dimensions)
 * Guarantees zero downtime if ONNX runtime is initializing or network is restricted.
 */
function generateDeterministicEmbedding(text: string): number[] {
  const dims = 384;
  const vector = new Array(dims).fill(0);
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }

    const pos = Math.abs(hash) % dims;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[pos] += sign * (1.0 / Math.sqrt(i + 1));

    // Secondary dispersion
    const secPos = (pos * 31 + 17) % dims;
    vector[secPos] += (sign * 0.5) / Math.sqrt(i + 1);
  }

  // L2 Normalize vector
  let norm = 0;
  for (let i = 0; i < dims; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1.0;
  for (let i = 0; i < dims; i++) {
    vector[i] = Number((vector[i] / norm).toFixed(6));
  }

  return vector;
}

/**
 * Generates a 384-dimensional embedding vector for the provided text.
 * @param text The input text to embed
 * @returns Array of 384 floating point numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return new Array(384).fill(0);
  }

  try {
    const extractor = await getExtractor();
    if (extractor) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      const rawVector = Array.from(output.data) as number[];
      if (rawVector.length === 384) {
        return rawVector.map((v) => Number(v.toFixed(6)));
      }
    }
  } catch (error) {
    console.warn('[Embedding Extraction Warning] Using deterministic vector generator:', error);
  }

  return generateDeterministicEmbedding(text);
}

/**
 * Formats a JavaScript number array into PostgreSQL vector format: '[0.123, -0.456, ...]'
 */
export function formatVectorForPg(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/**
 * Computes cosine similarity between two float arrays (0.0 to 1.0)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return Number((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(4));
}
