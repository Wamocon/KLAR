import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ExtractedClaim, JudgmentResult, ClaimSource } from "@/types";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

// Stable Gemini 2.5 Flash model — best price-performance for high-volume fact-checking
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
});

// Grounded model — uses Google Search for real-time web grounding
const groundedModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
  tools: [{ googleSearch: {} } as never],
});

const AI_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI request timed out")), ms)
    ),
  ]);
}

export async function extractClaims(text: string): Promise<ExtractedClaim[]> {
  const prompt = `You are a factual claim extraction system. Analyze the following text and extract every distinct factual claim that can be verified against external sources.

Rules:
- Extract ONLY factual claims (statements presented as facts)
- SKIP opinions, questions, subjective statements, and stylistic elements
- Each claim should be a single, atomic, verifiable statement
- Include the original sentence each claim comes from
- Track the character position (start/end) of each claim in the original text
- Respond ONLY with valid JSON, no markdown

Text to analyze:
"""
${text}
"""

Respond with a JSON array of objects, each with:
- "claim_text": the extracted factual claim as a clear statement
- "original_sentence": the full original sentence containing the claim
- "position_start": character index where the claim starts in the original text
- "position_end": character index where the claim ends in the original text`;

  const result = await withTimeout(model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            claim_text: { type: SchemaType.STRING },
            original_sentence: { type: SchemaType.STRING },
            position_start: { type: SchemaType.INTEGER },
            position_end: { type: SchemaType.INTEGER },
          },
          required: [
            "claim_text",
            "original_sentence",
            "position_start",
            "position_end",
          ],
        },
      },
    },
  }), AI_TIMEOUT_MS);

  const response = result.response;
  const jsonText = response.text();

  try {
    const claims: ExtractedClaim[] = JSON.parse(jsonText);
    return claims.filter(
      (c) => c.claim_text && c.claim_text.trim().length > 0
    );
  } catch {
    throw new Error("Failed to parse claim extraction response");
  }
}

export async function judgeClaim(
  claim: ExtractedClaim,
  sources: ClaimSource[]
): Promise<JudgmentResult> {
  const sourcesText = sources
    .map(
      (s, i) =>
        `Source ${i + 1} [${s.source_type}]: "${s.title}"\nURL: ${s.url}\nContent: ${s.snippet}`
    )
    .join("\n\n");

  const prompt = `You are a factual claim verification judge. Compare the following claim against the provided evidence sources and determine if the claim is supported, contradicted, or unverifiable.

CLAIM: "${claim.claim_text}"

EVIDENCE SOURCES:
${sourcesText || "No evidence sources found."}

Rules:
- "supported": The evidence clearly confirms the claim, or the claim is very close to what the evidence states
- "contradicted": The evidence clearly contradicts the claim or shows it is factually wrong
- "unverifiable": The evidence is insufficient, ambiguous, or no relevant sources were found
- Be conservative: if evidence is partial or unclear, use "unverifiable"
- Provide a clear, concise reasoning for your verdict
- Rate your confidence from 0.0 to 1.0

Respond with a JSON object containing:
- "verdict": one of "supported", "contradicted", "unverifiable"
- "confidence": a number between 0.0 and 1.0
- "reasoning": a clear explanation of why you reached this verdict (2-3 sentences)`;

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
        },
        required: ["verdict", "confidence", "reasoning"],
      },
    },
  }), AI_TIMEOUT_MS);

  const response = result.response;
  const jsonText = response.text();

  try {
    const judgment = JSON.parse(jsonText);
    return {
      claim,
      verdict: judgment.verdict,
      confidence: Math.min(1, Math.max(0, judgment.confidence)),
      reasoning: judgment.reasoning,
      sources,
    };
  } catch {
    return {
      claim,
      verdict: "unverifiable",
      confidence: 0,
      reasoning: "Failed to process AI judgment for this claim.",
      sources,
    };
  }
}

/**
 * Use Gemini with Google Search grounding to fact-check a claim in real-time.
 * Returns the grounded answer + structured source citations from the web.
 */
export async function groundedFactCheck(
  claimText: string
): Promise<{
  answer: string;
  sources: ClaimSource[];
  searchQueries: string[];
}> {
  try {
    const prompt = `Fact-check this claim and provide a detailed assessment with evidence. Is it true, false, or unverifiable?\n\nClaim: "${claimText}"`;

    const result = await withTimeout(
      groundedModel.generateContent(prompt),
      AI_TIMEOUT_MS
    );

    const response = result.response;
    const candidate = response.candidates?.[0];
    const answer = response.text();

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
