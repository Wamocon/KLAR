import { extractClaims, judgeClaim } from "@/lib/ai/gemini";
import { findEvidence } from "@/lib/evidence/search";
import { sanitizeClaim } from "@/lib/security/sanitize";
import { analyzeClaimQuality } from "@/lib/nlp/claim-quality";
import { detectHallucinations } from "@/lib/nlp/hallucination-detector";
import { crossReferenceValidation } from "@/lib/evidence/cross-reference";
import { detectBias } from "@/lib/analysis/bias-detector";
import { detectAIContent } from "@/lib/analysis/ai-detector";
import { detectPlagiarism } from "@/lib/analysis/plagiarism-detector";
import { evaluateWithFrameworks } from "@/lib/analysis/framework-evaluator";
import type {
  AnalysisMode,
  ExtractedClaim,
  JudgmentResult,
  Verification,
  Claim,
  PipelineEvent,
} from "@/types";

export interface VerificationResult {
  verification: Omit<Verification, "id" | "user_id" | "created_at">;
  claims: Omit<Claim, "id" | "verification_id" | "created_at">[];
}

export async function* runVerificationPipeline(
  text: string,
  language: string = "en",
  analyses: AnalysisMode[] = ["fact-check"]
): AsyncGenerator<PipelineEvent> {
  const startTime = Date.now();
  const isComprehensive = analyses.includes("comprehensive");
  const runFactCheck = isComprehensive || analyses.includes("fact-check");
  const runBias = isComprehensive || analyses.includes("bias-check");
  const runAIDetection = isComprehensive || analyses.includes("ai-detection");
  const runPlagiarism = isComprehensive || analyses.includes("plagiarism");
  const runFrameworks = isComprehensive || analyses.includes("framework-eval");

  // ── Pre-analysis: AI Detection & Bias (run on raw text before claim extraction) ──

  if (runAIDetection) {
    yield { type: "status", stage: "ai-detection", message: "Analyzing for AI-generated content…" };
    const aiResult = detectAIContent(text);
    yield { type: "ai_detection", result: aiResult };
  }

  if (runFrameworks) {
    yield { type: "status", stage: "framework-eval", message: "Evaluating with MECE, Red Team, BLUF, Pre-Mortem…" };
    const frameworkResult = evaluateWithFrameworks(text);
    yield { type: "framework_evaluation", result: frameworkResult };
  }

  // ── Claim extraction (needed for fact-check, bias, plagiarism) ──

  if (!runFactCheck && !runPlagiarism) {
    // For bias-only or AI-detection-only, we can skip claim extraction
    if (runBias) {
      yield { type: "status", stage: "bias-check", message: "Detecting bias patterns…" };
      const biasResult = detectBias(text, []);
      yield { type: "bias_analysis", result: biasResult };
    }

    const processingTime = Date.now() - startTime;
    const verification: Omit<Verification, "id" | "user_id" | "created_at"> = {
      input_text: text,
      source_url: null,
      source_title: null,
      is_public: false,
      language,
      total_claims: 0,
      supported_count: 0,
      unverifiable_count: 0,
      contradicted_count: 0,
      trust_score: 0,
      status: "completed",
      processing_time_ms: processingTime,
    };
    yield { type: "completed", verification: verification as Verification, claims: [] };
    return;
  }

  // Stage 1: Extract claims
  yield { type: "status", stage: "extracting", message: "Extracting factual claims from text…" };

  let extractedClaims: ExtractedClaim[];
  try {
    extractedClaims = await extractClaims(text);
  } catch (error) {
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to extract claims",
    };
    return;
  }

  if (extractedClaims.length === 0) {
    yield {
      type: "error",
      message: "No factual claims found in the provided text.",
    };
    return;
  }

  // Cap claims to avoid Vercel 60s timeout — process most important first
  const MAX_CLAIMS = 5;
  if (extractedClaims.length > MAX_CLAIMS) {
    extractedClaims = extractedClaims.slice(0, MAX_CLAIMS);
  }

  yield { type: "claims_extracted", claims: extractedClaims };

  // Stage 1.5: NLP Claim Quality Analysis
  yield { type: "status", stage: "analyzing", message: "Analyzing claim quality with NLP…" };

  for (let i = 0; i < extractedClaims.length; i++) {
    const quality = analyzeClaimQuality(extractedClaims[i]);
    yield { type: "claim_quality", index: i, quality };
  }

  // Stage 2 & 3: Search evidence and judge each claim
  yield { type: "status", stage: "searching", message: "Searching evidence sources with grounded search…" };

  const judgments: JudgmentResult[] = [];
  let supported = 0;
  let unverifiable = 0;
  let contradicted = 0;

  // Sanitize all claims up front
  const sanitizedClaims = extractedClaims.map((claim) => ({
    ...claim,
    claim_text: sanitizeClaim(claim.claim_text),
  }));

  // Process claims in parallel batches for speed (fits within Vercel 60s limit)
  const BATCH_SIZE = 5;
  for (let batchStart = 0; batchStart < sanitizedClaims.length; batchStart += BATCH_SIZE) {
    const batch = sanitizedClaims.slice(batchStart, batchStart + BATCH_SIZE);
    const batchIndices = batch.map((_, j) => batchStart + j);

    yield {
      type: "status",
      stage: "judging",
      message: `Evaluating claims ${batchStart + 1}–${Math.min(batchStart + BATCH_SIZE, sanitizedClaims.length)} of ${sanitizedClaims.length}…`,
    };

    // Parallel: find evidence + judge for all claims in this batch
    const batchResults = await Promise.all(
      batch.map(async (sanitizedClaim) => {
        const sources = await findEvidence(sanitizedClaim, language);
        const judgment = await judgeClaim(sanitizedClaim, sources);
        const crossRef = crossReferenceValidation(sanitizedClaim.claim_text, sources);
        const hallucinationCheck = detectHallucinations(sanitizedClaim.claim_text, sources);
        return { judgment, crossRef, hallucinationCheck, sources };
      })
    );

    // Yield results sequentially for proper SSE ordering
    for (let j = 0; j < batchResults.length; j++) {
      const idx = batchIndices[j];
      const { judgment, crossRef, hallucinationCheck } = batchResults[j];

      yield { type: "cross_reference", index: idx, result: crossRef };
      yield { type: "hallucination_check", index: idx, analysis: hallucinationCheck };

      // Adjust confidence based on cross-reference and hallucination signals
      let adjustedConfidence = judgment.confidence;

      if (crossRef.sourceConsensus === "strong") {
        adjustedConfidence = Math.min(1, adjustedConfidence + 0.1);
      } else if (crossRef.sourceConsensus === "none") {
        adjustedConfidence = Math.max(0, adjustedConfidence - 0.1);
      }

      if (hallucinationCheck.riskLevel === "critical") {
        adjustedConfidence = Math.max(0, adjustedConfidence - 0.2);
      } else if (hallucinationCheck.riskLevel === "high") {
        adjustedConfidence = Math.max(0, adjustedConfidence - 0.1);
      }

      const enhancedJudgment: JudgmentResult = {
        ...judgment,
        confidence: Math.round(adjustedConfidence * 100) / 100,
      };

      judgments.push(enhancedJudgment);

      switch (enhancedJudgment.verdict) {
        case "supported":
          supported++;
          break;
        case "unverifiable":
          unverifiable++;
          break;
        case "contradicted":
          contradicted++;
          break;
      }

      yield { type: "claim_judged", index: idx, result: enhancedJudgment };
    }
  }

  // ── Post fact-check analyses (use collected sources) ──

  const allSources = judgments.flatMap((j) => j.sources);

  if (runBias) {
    yield { type: "status", stage: "bias-check", message: "Detecting bias patterns…" };
    const biasResult = detectBias(text, allSources);
    yield { type: "bias_analysis", result: biasResult };
  }

  if (runPlagiarism) {
    yield { type: "status", stage: "plagiarism", message: "Checking for plagiarism…" };
    const plagiarismResult = detectPlagiarism(text, allSources);
    yield { type: "plagiarism_check", result: plagiarismResult };
  }

  const processingTime = Date.now() - startTime;
  const totalClaims = extractedClaims.length;
  const trustScore = totalClaims > 0 ? Math.round((supported / totalClaims) * 100) : 0;

  const verification: Omit<Verification, "id" | "user_id" | "created_at"> = {
    input_text: text,
    source_url: null,
    source_title: null,
    is_public: false,
    language,
    total_claims: totalClaims,
    supported_count: supported,
    unverifiable_count: unverifiable,
    contradicted_count: contradicted,
    trust_score: trustScore,
    status: "completed",
    processing_time_ms: processingTime,
  };

  const claims: Omit<Claim, "id" | "verification_id" | "created_at">[] =
    judgments.map((j) => ({
      claim_text: j.claim.claim_text,
      original_sentence: j.claim.original_sentence,
      verdict: j.verdict,
      confidence: j.confidence,
      reasoning: j.reasoning,
      sources: j.sources,
      position_start: j.claim.position_start,
      position_end: j.claim.position_end,
    }));

  yield {
    type: "completed",
    verification: verification as Verification,
    claims: claims as Claim[],
  };
}
