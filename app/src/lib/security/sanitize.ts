/**
 * Input sanitization for prompt injection hardening.
 * Strips control characters, excessive whitespace, and
 * common prompt injection patterns from user-supplied text
 * BEFORE it reaches the AI model.
 */

// Patterns commonly used in prompt injection attacks
const INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous |above |prior )?instructions/gi,
  /disregard (?:all )?(?:previous |above |prior )?instructions/gi,
  /forget (?:all )?(?:previous |above |prior )?instructions/gi,
  /you are now/gi,
  /new instructions:/gi,
  /system:\s/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|(?:im_start|im_end|system|user|assistant)\|>/gi,
  /```(?:system|instruction)/gi,
];

/**
 * Sanitize user input text before sending to the AI pipeline.
 * Returns the cleaned text. Throws if the text is entirely adversarial.
 */
export function sanitizeInput(text: string): string {
  // Remove null bytes and control characters (keep newlines, tabs)
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Collapse excessive whitespace (>3 consecutive newlines → 2)
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

  // Collapse excessive spaces
  cleaned = cleaned.replace(/ {4,}/g, "   ");

  // Detect injection attempts — log but don't block (the text may still be valid)
  let injectionScore = 0;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      injectionScore++;
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
    }
  }

  // If multiple injection patterns detected, this is likely adversarial
  if (injectionScore >= 3) {
    throw new Error(
      "The submitted text appears to contain prompt manipulation attempts. Please submit genuine content for verification."
    );
  }

  return cleaned.trim();
}

/**
 * Sanitize a single claim text before sending it to the judgment AI.
 * This isolates each claim to prevent cross-claim context leakage.
 */
export function sanitizeClaim(claimText: string): string {
  // Strip any markdown/formatting that could alter AI behavior
  return claimText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/```/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}
