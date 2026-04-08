import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ExtractedClaim, JudgmentResult, ClaimSource } from "@/types";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

// Model name — configurable via env var for zero-downtime upgrades
const AI_MODEL = process.env.KLAR_AI_MODEL || "gemini-2.5-flash";

// Fast model for structured extraction tasks (no thinking overhead)
// We use the REST API directly for extraction to set thinkingBudget: 0
// (the deprecated SDK doesn't support thinkingConfig)
const FAST_MODEL = process.env.KLAR_FAST_MODEL || "gemini-2.5-flash";

// Primary model — Gemini 2.5 Flash for reasoning-heavy tasks (judgment, evidence evaluation)
const model = genAI.getGenerativeModel({
  model: AI_MODEL,
  generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
});

// Grounded model — uses Google Search for real-time web grounding
const groundedModel = genAI.getGenerativeModel({
  model: AI_MODEL,
  generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
  tools: [{ googleSearch: {} } as never],
});

// Per-call timeouts — tuned to fit multiple calls within Vercel's 60s limit
const EXTRACT_TIMEOUT_MS = 30000; // 30s for claim extraction
const JUDGE_TIMEOUT_MS = 20000;   // 20s per judgment call
const GROUNDED_TIMEOUT_MS = 15000; // 15s for grounded search

// Token usage tracking — request-scoped for thread safety
// Each concurrent request gets its own TokenTracker instance
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class TokenTracker {
  private _session: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  private _last: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  track(response: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }) {
    const meta = response.usageMetadata;
    if (meta) {
      const usage: TokenUsage = {
        promptTokens: meta.promptTokenCount || 0,
        completionTokens: meta.candidatesTokenCount || 0,
        totalTokens: meta.totalTokenCount || 0,
      };
      this._last = usage;
      this._session.promptTokens += usage.promptTokens;
      this._session.completionTokens += usage.completionTokens;
      this._session.totalTokens += usage.totalTokens;
    }
  }

  getSession(): TokenUsage { return { ...this._session }; }
  getLast(): TokenUsage { return { ...this._last }; }
  reset(): void { this._session = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }; }
}

// Estimate tokens before sending (rough: ~4 chars per token for English)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI request timed out")), ms)
    ),
  ]);
}

export interface ExtractOptions {
  /** Maximum claims to extract (default: 10) */
  maxClaims?: number;
  /** Timeout in ms (default: EXTRACT_TIMEOUT_MS) */
  timeoutMs?: number;
}

export async function extractClaims(
  text: string,
  language: string = "en",
  tracker?: TokenTracker,
  options?: ExtractOptions
): Promise<ExtractedClaim[]> {
  const maxClaims = options?.maxClaims ?? 10;
  const timeoutMs = options?.timeoutMs ?? EXTRACT_TIMEOUT_MS;
  // Truncate text — shorter text = faster AI response
  // 10K chars is the safe limit for reliable <30s responses
  const truncatedText = text.length > 10000 ? text.slice(0, 10000) : text;

  const langInstruction = language === "de"
    ? "The text is in German. Extract claims in their original German wording but ensure they are factually verifiable statements."
    : language !== "en"
      ? `The text is in ${language}. Extract claims in their original language but ensure they are factually verifiable statements.`
      : "";

  const prompt = `You are an expert factual claim extraction system used by journalists, researchers, and businesses to verify content accuracy.

Your task: Analyze the following text and extract every distinct, verifiable factual claim. Prioritize claims that are:
1. Most likely to be false or misleading (statistics, dates, names, amounts)
2. Most impactful if wrong (health claims, legal claims, financial claims)
3. Most specific (exact numbers, proper nouns, named entities)

${langInstruction}

Extraction Rules:
- Extract ONLY factual claims (statements presented as facts that can be checked against external sources)
- SKIP opinions, questions, subjective statements, meta-commentary, and stylistic elements
- Each claim should be a single, atomic, verifiable statement
- For compound claims ("X happened in 2020 and Y happened in 2021"), split into separate claims
- Include the original sentence each claim comes from
- Track the character position (start/end) of each claim in the original text
- Extract UP TO ${maxClaims} claims, prioritized by importance and verifiability
- Respond ONLY with valid JSON

Text to analyze:
"""
${truncatedText}
"""

Respond with a JSON array of objects, each with:
- "claim_text": the extracted factual claim as a clear, standalone statement
- "original_sentence": the full original sentence containing the claim
- "position_start": character index where the claim starts in the original text
- "position_end": character index where the claim ends in the original text`;

  // Direct REST API call with thinkingBudget: 0 — bypasses thinking overhead
  // The deprecated @google/generative-ai SDK doesn't support thinkingConfig,
  // but the REST API does. This drops extraction from ~35s to ~5-8s.
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${FAST_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            claim_text: { type: "STRING" },
            original_sentence: { type: "STRING" },
            position_start: { type: "INTEGER" },
            position_end: { type: "INTEGER" },
          },
          required: [
            "claim_text",
            "original_sentence",
            "position_start",
            "position_end",
          ],
        },
      },
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let result: Response;
  try {
    result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI request timed out during claim extraction");
    }
    throw err;
  }
  clearTimeout(timer);

  if (!result.ok) {
    const errData = await result.json().catch(() => ({ error: { message: result.statusText } }));
    throw new Error(`Gemini API error: ${errData.error?.message || result.statusText}`);
  }

  const data = await result.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!jsonText) {
    throw new Error("Empty response from Gemini API during claim extraction");
  }

  // Track token usage
  if (tracker && data.usageMetadata) {
    tracker.track({
      usageMetadata: {
        promptTokenCount: data.usageMetadata.promptTokenCount,
        candidatesTokenCount: data.usageMetadata.candidatesTokenCount,
        totalTokenCount: data.usageMetadata.totalTokenCount,
      },
    });
  }

  try {
    const claims: ExtractedClaim[] = JSON.parse(jsonText);
    return claims.filter(
      (c) => c.claim_text && c.claim_text.trim().length > 0
    );
  } catch {
    throw new Error("Failed to parse claim extraction response");
  }
}

export interface JudgeOptions {
  /** Timeout in ms (default: JUDGE_TIMEOUT_MS) */
  timeoutMs?: number;
}

export async function judgeClaim(
  claim: ExtractedClaim,
  sources: ClaimSource[],
  language: string = "en",
  tracker?: TokenTracker,
  judgeOptions?: JudgeOptions
): Promise<JudgmentResult> {
  const judgeTimeout = judgeOptions?.timeoutMs ?? JUDGE_TIMEOUT_MS;
  const sourcesText = sources
    .map(
      (s, i) =>
        `Source ${i + 1} [${s.source_type}${s.credibility_score ? `, credibility: ${s.credibility_score}` : ""}]: "${s.title}"\nURL: ${s.url}\nContent: ${s.snippet}`
    )
    .join("\n\n");

  const langNote = language !== "en"
    ? `The claim may be in ${language === "de" ? "German" : language}. Evaluate it regardless of language — sources in any language are valid evidence.`
    : "";

  const prompt = `You are a senior fact-checking judge used by journalists and researchers. Compare the following claim against the provided evidence sources and determine if the claim is supported, contradicted, or unverifiable.

${langNote}

CLAIM: "${claim.claim_text}"

EVIDENCE SOURCES:
${sourcesText || "No evidence sources found."}

Evaluation Rules:
- "supported": The evidence clearly confirms the claim. Minor wording differences are acceptable if the factual core matches.
- "contradicted": The evidence clearly contradicts the claim — wrong numbers, incorrect dates, false attributions, or factually incorrect statements.
- "unverifiable": The evidence is insufficient, ambiguous, or no relevant sources were found. Be honest — if you can't verify it, say so.
- Be conservative: if evidence is partial or unclear, use "unverifiable"
- Provide a clear, concise reasoning explaining WHY you reached this verdict (cite specific source evidence)
- Provide a specific, actionable recommendation for how to fix or improve the claim if it's contradicted or unverifiable
- Rate your confidence from 0.0 to 1.0

Respond with a JSON object containing:
- "verdict": one of "supported", "contradicted", "unverifiable"
- "confidence": a number between 0.0 and 1.0
- "reasoning": a clear explanation citing specific evidence (2-3 sentences)
- "recommendation": a specific action to fix/improve the claim (1-2 sentences). For supported claims, say "No changes needed." For contradicted, suggest the correct information. For unverifiable, suggest how to verify.`;

  const result = await withTimeout(model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          verdict: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["supported", "contradicted", "unverifiable"],
          },
          confidence: { type: SchemaType.NUMBER },
          reasoning: { type: SchemaType.STRING },
          recommendation: { type: SchemaType.STRING },
        },
        required: ["verdict", "confidence", "reasoning", "recommendation"],
      },
    },
  }), judgeTimeout);

  const response = result.response;
  tracker?.track(response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } });
  const jsonText = response.text();

  try {
    const judgment = JSON.parse(jsonText);
    return {
      claim,
      verdict: judgment.verdict,
      confidence: Math.min(1, Math.max(0, judgment.confidence)),
      reasoning: judgment.reasoning,
      recommendation: judgment.recommendation || undefined,
      sources,
    };
  } catch {
    return {
      claim,
      verdict: "unverifiable",
      confidence: 0,
      reasoning: "Failed to process AI judgment for this claim.",
      recommendation: "Please retry the analysis or verify this claim manually.",
      sources,
    };
  }
}

/**
 * Use Gemini with Google Search grounding to fact-check a claim in real-time.
 * Returns the grounded answer + structured source citations from the web.
 */
export async function groundedFactCheck(
  claimText: string,
  tracker?: TokenTracker
): Promise<{
  answer: string;
  sources: ClaimSource[];
  searchQueries: string[];
}> {
  try {
    const prompt = `Fact-check this claim and provide a detailed assessment with evidence. Is it true, false, or unverifiable?\n\nClaim: "${claimText}"`;

    const result = await withTimeout(
      groundedModel.generateContent(prompt),
      GROUNDED_TIMEOUT_MS
    );

    const response = result.response;
    const candidate = response.candidates?.[0];
    const answer = response.text();
    tracker?.track(response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } });

    const sources: ClaimSource[] = [];
    const searchQueries: string[] = [];

    // Extract grounding metadata from the response
    const metadata = candidate?.groundingMetadata as {
      webSearchQueries?: string[];
      groundingChunks?: { web?: { uri?: string; title?: string } }[];
      groundingSupports?: {
        segment?: { startIndex?: number; endIndex?: number; text?: string };
        groundingChunkIndices?: number[];
      }[];
    } | undefined;

    if (metadata) {
      if (metadata.webSearchQueries) {
        searchQueries.push(...metadata.webSearchQueries);
      }

      if (metadata.groundingChunks) {
        for (const chunk of metadata.groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || "Web Source",
              url: chunk.web.uri,
              snippet: "",
              source_type: "web",
            });
          }
        }
      }

      // Enrich source snippets from grounding supports
      if (metadata.groundingSupports && metadata.groundingChunks) {
        for (const support of metadata.groundingSupports) {
          const segmentText = support.segment?.text || "";
          if (support.groundingChunkIndices) {
            for (const idx of support.groundingChunkIndices) {
              if (idx < sources.length && segmentText) {
                // Append supporting text to the source snippet
                sources[idx].snippet = sources[idx].snippet
                  ? `${sources[idx].snippet} ${segmentText}`
                  : segmentText;
              }
            }
          }
        }
      }
    }

    return { answer, sources, searchQueries };
  } catch {
    return { answer: "", sources: [], searchQueries: [] };
  }
}
