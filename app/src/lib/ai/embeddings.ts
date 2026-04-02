import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import type { SemanticScore, ClaimSource } from "@/types";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

/**
 * Generate an embedding for a factual claim using RETRIEVAL_QUERY task type.
 * Optimized for retrieving evidence documents that support or refute the claim.
 */
export async function embedClaim(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: TaskType.RETRIEVAL_QUERY,
  });
  return result.embedding.values;
}

/**
 * Generate an embedding for a document/evidence snippet for retrieval.
 */
export async function embedDocument(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });
  return result.embedding.values;
}

/**
 * Compute cosine similarity between two vectors.
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

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Score the semantic relevance of evidence sources against a claim.
 * Uses Gemini embeddings with FACT_VERIFICATION task type for optimal accuracy.
 */
export async function scoreSourceRelevance(
  claimText: string,
  sources: ClaimSource[]
): Promise<SemanticScore[]> {
  if (sources.length === 0) return [];

  try {
    // Embed the claim for fact verification
    const claimEmbedding = await embedClaim(claimText);

    // Embed all source snippets as documents
    const sourceTexts = sources.map(
      (s) => `${s.title}. ${s.snippet}`
    );

    const scores: SemanticScore[] = [];

    // Process in parallel (batch)
    const embedPromises = sourceTexts.map((text) => embedDocument(text));
    const docEmbeddings = await Promise.all(embedPromises);

    for (const docEmb of docEmbeddings) {
      const similarity = cosineSimilarity(claimEmbedding, docEmb);
      scores.push({
        similarity,
        relevance:
          similarity >= 0.7
            ? "high"
            : similarity >= 0.5
            ? "medium"
            : similarity >= 0.3
            ? "low"
            : "none",
      });
    }

    return scores;
  } catch {
    // Fallback: return neutral scores if embeddings fail
    return sources.map(() => ({ similarity: 0.5, relevance: "medium" as const }));
  }
}

/**
 * Filter and rank sources by semantic relevance to the claim.
 * Returns only sources above the minimum relevance threshold.
 */
export async function rankSourcesByRelevance(
  claimText: string,
  sources: ClaimSource[],
  minSimilarity: number = 0.25
): Promise<{ source: ClaimSource; similarity: number }[]> {
  const scores = await scoreSourceRelevance(claimText, sources);

  return sources
    .map((source, i) => ({
      source,
      similarity: scores[i]?.similarity ?? 0,
    }))
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);
}
