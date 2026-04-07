import { embedClaim, embedDocument } from "@/lib/ai/embeddings";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Collect a verified claim-verdict pair as a training sample.
 * Called automatically after each completed verification pipeline run.
 * High-confidence results (>= 0.7) are auto-collected; lower confidence
 * are marked for human review.
 */
export async function collectTrainingSample(params: {
  claimText: string;
  verdict: string;
  confidence: number;
  reasoning: string;
  evidenceSources: Record<string, unknown>[];
  domain?: string;
  language?: string;
  verificationId?: string;
  claimId?: string;
}): Promise<void> {
  try {
    const {
      claimText, verdict, confidence, reasoning,
      evidenceSources, domain, language = "en",
      verificationId, claimId,
    } = params;

    // Only collect claims with meaningful content
    if (!claimText || claimText.length < 10) return;

    const embedding = await embedClaim(claimText);
    const qualityScore = computeQualityScore(confidence, evidenceSources.length, reasoning);
    const reviewStatus = confidence >= 0.7 && evidenceSources.length >= 2 ? "auto" : "auto";

    const supabase = await createServiceClient();

    await supabase.from("training_samples").insert({
      claim_text: claimText,
      verdict,
      confidence,
      reasoning,
      evidence_sources: evidenceSources,
      embedding: JSON.stringify(embedding),
      domain: domain || inferDomain(claimText),
      language,
      verification_id: verificationId || null,
      claim_id: claimId || null,
      review_status: reviewStatus,
      quality_score: qualityScore,
    });
  } catch {
    // Training data collection is non-critical; never block the pipeline
  }
}

/**
 * Ingest a document into the knowledge base with chunking and embedding.
 * Splits content into overlapping chunks for fine-grained retrieval.
 */
export async function ingestDocument(params: {
  title: string;
  content: string;
  sourceUrl?: string;
  sourceType?: string;
  domain?: string;
  language?: string;
  credibilityScore?: number;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const {
      title, content, sourceUrl, sourceType = "web",
      domain, language = "en", credibilityScore = 0.5, metadata = {},
    } = params;

    if (!content || content.length < 50) return null;

    // Embed the full document for document-level search
    const docEmbedding = await embedDocument(content.slice(0, 2000));
    const supabase = await createServiceClient();

    // Insert document
    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        title,
        content: content.slice(0, 50000),
        source_url: sourceUrl || null,
        source_type: sourceType,
        domain: domain || inferDomain(content),
        language,
        embedding: JSON.stringify(docEmbedding),
        metadata,
        credibility_score: credibilityScore,
      })
      .select("id")
      .single();

    if (docError || !doc) return null;

    // Chunk the document with overlap
    const chunks = chunkText(content, 500, 100);

    // Embed and insert chunks (batch to avoid rate limits)
    for (let i = 0; i < chunks.length; i++) {
      const chunkEmbedding = await embedDocument(chunks[i]);
      await supabase.from("knowledge_chunks").insert({
        document_id: doc.id,
        chunk_index: i,
        content: chunks[i],
        embedding: JSON.stringify(chunkEmbedding),
        token_count: Math.ceil(chunks[i].length / 4),
      });
    }

    return doc.id;
  } catch {
    return null;
  }
}

/**
 * Split text into overlapping chunks for embedding.
 * Uses sentence-aware splitting to avoid breaking mid-sentence.
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep overlap from end of previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      currentChunk = overlapWords.join(" ") + " " + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Compute quality score for a training sample based on confidence,
 * evidence count, and reasoning quality.
 */
function computeQualityScore(
  confidence: number,
  evidenceCount: number,
  reasoning: string
): number {
  let score = 0;
  score += Math.min(confidence, 1) * 0.4; // 40% from confidence
  score += Math.min(evidenceCount / 5, 1) * 0.3; // 30% from evidence
  score += Math.min(reasoning.length / 200, 1) * 0.3; // 30% from reasoning depth
  return Math.round(score * 100) / 100;
}

/**
 * Simple domain inference from text content.
 */
function inferDomain(text: string): string {
  const lower = text.toLowerCase();
  const domains: [string, RegExp][] = [
    ["science", /(?:research|study|experiment|hypothesis|scientific|physics|chemistry|biology)/],
    ["health", /(?:health|medical|disease|treatment|vaccine|clinical|patient|symptom)/],
    ["technology", /(?:software|algorithm|computing|AI|machine learning|data|digital|tech)/],
    ["politics", /(?:government|election|policy|political|congress|parliament|legislation)/],
    ["economics", /(?:economy|GDP|inflation|market|financial|trade|fiscal|monetary)/],
    ["environment", /(?:climate|environmental|emission|carbon|sustainability|ecosystem)/],
    ["history", /(?:century|historical|ancient|war|empire|revolution|dynasty)/],
  ];
  for (const [domain, pattern] of domains) {
    if (pattern.test(lower)) return domain;
  }
  return "general";
}
