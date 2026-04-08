/**
 * KLAR Extension — Shared Constants
 */

const KLAR = {
  API_BASE: "https://klar-app.vercel.app",
  MIN_TEXT_LENGTH: 50,
  MAX_TEXT_LENGTH: 50000,
  MAX_VISIBLE_CLAIMS: 8,
  // Retry configuration — exponential backoff for transient failures
  MAX_RETRIES: 1,
  RETRY_BASE_DELAY_MS: 2000,
  // Timeout per individual request (extract or judge) — each is fast now
  FETCH_TIMEOUT_MS: 45000,
};
