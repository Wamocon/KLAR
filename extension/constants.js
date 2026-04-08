/**
 * KLAR Extension — Shared Constants
 */

const KLAR = {
  API_BASE: "https://klar-app.vercel.app",
  MIN_TEXT_LENGTH: 50,
  MAX_TEXT_LENGTH: 5000,
  MAX_VISIBLE_CLAIMS: 3,
  // Retry configuration — exponential backoff for transient failures
  MAX_RETRIES: 1,
  RETRY_BASE_DELAY_MS: 2000,
  // Timeout for fetch requests — matches Vercel 60s limit + 5s network overhead
  FETCH_TIMEOUT_MS: 65000,
};
