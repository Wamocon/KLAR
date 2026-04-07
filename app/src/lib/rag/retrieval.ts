import { embedClaim, embedDocument, cosineSimilarity } from "@/lib/ai/embeddings";
import { createServiceClient } from "@/lib/supabase/server";
import type { ClaimSource } from "@/types";

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  sourceType: string;
  sourceUrl: string | null;
  domain: string | null;
  credibilityScore: number;
}

export interface TrainingSample {
  id: string;
  claimText: string;
  verdict: string;
  confidence: number;
  reasoning: string | null;
  similarity: number;
}

/**
 * Retrieve relevant knowledge chunks using vector similarity search.
 * Uses pgvector HNSW index for fast approximate nearest-neighbor lookup.
 */
export async function retrieveKnowledge(
  claimText: string,
  options: {
    threshold?: number;
    limit?: number;
    domain?: string;
  } = {}
): Promise<KnowledgeChunk[]> {
  const { threshold = 0.3, limit = 8, domain } = options;

  try {
    const embedding = await embedClaim(claimText);
    const supabase = await createServiceClient();

    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: threshold,
      match_count: limit,
      filter_domain: domain || null,
    });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      documentId: row.document_id as string,
      content: row.content as string,
      similarity: row.similarity as number,
      sourceType: row.source_type as string,
      sourceUrl: row.source_url as string | null,
      domain: row.domain as string | null,
      credibilityScore: row.credibility_score as number,
    }));
  } catch {
    // RAG retrieval is non-critical; gracefully degrade
    return [];
  }
}

/**
 * Retrieve similar verified training samples for few-shot context.
 * Used to provide the LLM with examples of how similar claims were judged.
 */
export async function retrieveTrainingSamples(
  claimText: string,
  limit: number = 3
): Promise<TrainingSample[]> {
  try {
    const embedding = await embedClaim(claimText);
    const supabase = await createServiceClient();

    const { data, error } = await supabase.rpc("match_training_samples", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.4,
      match_count: limit,
    });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      claimText: row.claim_text as string,
      verdict: row.verdict as string,
      confidence: row.confidence as number,
      reasoning: row.reasoning as string | null,
      similarity: row.similarity as number,
    }));
  } catch {
    return [];
  }
}

/**
 * Convert RAG knowledge chunks into ClaimSource format for the pipeline.
 */
export function knowledgeToSources(chunks: KnowledgeChunk[]): ClaimSource[] {
  return chunks.map((chunk) => ({
    url: chunk.sourceUrl || "",
    title: `[Knowledge Base] ${chunk.domain || "general"}`,
    snippet: chunk.content.slice(0, 500),
    source_type: chunk.sourceType as ClaimSource["source_type"],
    credibility_score: chunk.credibilityScore,
  }));
}
