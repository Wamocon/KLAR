/**
 * KLAR Extension — Background Service Worker
 *
 * Handles context menus, API communication, and extension state.
 * Implements retry-with-backoff, AbortController timeouts, and
 * structured error propagation for reliable verification.
 */

importScripts("constants.js");

// ─── Keep-alive: prevent Chrome from killing the service worker during long API calls ───
let keepAliveInterval = null;
function startKeepAlive() {
  if (keepAliveInterval) return;
  // Ping every 20s — Chrome kills idle workers after 30s
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});
  }, 20000);
}
function stopKeepAlive() {
  if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
}

// Context menu for right-click → "Verify with KLAR"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "klar-verify-selection",
    title: chrome.i18n.getMessage("verifyWithKlar") || "Verify with KLAR",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "klar-verify-page",
    title: chrome.i18n.getMessage("verifyPage") || "Verify this page with KLAR",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "klar-verify-selection" && info.selectionText) {
    await verifyText(info.selectionText, tab?.id);
  } else if (info.menuItemId === "klar-verify-page" && tab?.url) {
    await verifyUrl(tab.url, tab.id, ["fact-check", "bias-check", "ai-detection"]);
  }
});

// Listen for messages from popup/content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "VERIFY_TEXT") {
    verifyText(message.text, message.tabId, message.analyses)
      .then(sendResponse)
      .catch(() => {}); // sender (popup) may have closed
    return true;
  }
  if (message.type === "VERIFY_URL") {
    // FIX: Forward analyses from the message (was being dropped before)
    verifyUrl(message.url, message.tabId, message.analyses).then(sendResponse);
    return true;
  }
  if (message.type === "VALIDATE_KEY") {
    validateApiKey(message.apiKey).then(sendResponse);
    return true;
  }
  if (message.type === "GET_API_KEY") {
    chrome.storage.sync.get(["apiKey"], (result) => {
      sendResponse({ apiKey: result.apiKey || null });
    });
    return true;
  }
  if (message.type === "SET_API_KEY") {
    chrome.storage.sync.set({ apiKey: message.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  if (message.type === "GET_LATEST_STATE") {
    sendResponse(latestState);
    return false;
  }
});

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey"], (result) => {
      resolve(result.apiKey || null);
    });
  });
}

// ─── Retry-capable fetch with AbortController timeout ───

/**
 * Fetch with automatic retry and timeout.
 * Uses AbortController for clean cancellation on timeout.
 * Retries on 5xx, 429 (with Retry-After), and network errors.
 * Does NOT retry on 4xx client errors (except 429).
 */
async function fetchWithRetry(url, options, { retries = KLAR.MAX_RETRIES, timeoutMs = KLAR.FETCH_TIMEOUT_MS } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      // Don't retry client errors (except 429 rate limit)
      if (response.status === 429 && attempt < retries) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "3", 10);
        await delay(retryAfter * 1000);
        continue;
      }

      // Retry on server errors (5xx) — likely transient cold-start or AI timeout
      if (response.status >= 500 && attempt < retries) {
        await delay(KLAR.RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      // AbortController timeout → convert to readable error
      if (err.name === "AbortError") {
        lastError = new Error("Request timed out — the server took too long to respond");
      }

      // Network error → retry with backoff
      if (attempt < retries) {
        await delay(KLAR.RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── API Key Validation (lightweight — no pipeline) ───

async function validateApiKey(apiKey) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${KLAR.API_BASE}/api/extension/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      return { valid: false, error: "invalid_key", message: "Invalid API key — not found on server" };
    }
    if (response.status === 403) {
      return { valid: false, error: "missing_scope", message: "API key does not have 'verify' scope" };
    }
    if (response.ok && data.valid) {
      return { valid: true, plan: data.plan || "free" };
    }

    return { valid: false, error: "unknown", message: data.error || "Validation failed" };
  } catch (err) {
    if (err.name === "AbortError") {
      return { valid: false, error: "timeout", message: "Server took too long — check your connection" };
    }
    const isNetwork = err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError");
    return {
      valid: false,
      error: isNetwork ? "network" : "unknown",
      message: isNetwork
        ? "Cannot reach KLAR server. Check your internet connection."
        : (err.message || "Validation failed"),
    };
  }
}

/**
 * Ensure the content script is injected into the target tab.
 */
async function ensureContentScript(tabId) {
  if (!tabId) return false;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "KLAR_PING" });
    return true;
  } catch {
    try {
      await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ["constants.js", "content.js"] });
      await new Promise((r) => setTimeout(r, 150));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Open the side panel so the user can see results immediately.
 */
async function openSidePanel(tabId) {
  try {
    if (tabId) {
      await chrome.sidePanel.open({ tabId });
    }
  } catch {
    // Side panel API may not be available
  }
}

// ─── Core Verification: Two-phase architecture ───
// Phase 1: Extract claims (single fast request)
// Phase 2: Judge each claim individually (parallel requests, 2 at a time)
// This bypasses Vercel's 60s limit — each request is well under the limit.

const JUDGE_CONCURRENCY = 2; // Max parallel judge requests

/**
 * Run the two-phase verification pipeline.
 * Works for both text and URL modes.
 */
async function runTwoPhaseVerification(tabId, extractBody, analyses) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const msg = chrome.i18n.getMessage("noApiKeyError") || "No API key configured. Open the extension popup to set up.";
    notifyTab(tabId, { type: "KLAR_ERROR", error: msg, errorCode: "no_api_key" });
    return { error: "No API key" };
  }

  await openSidePanel(tabId);
  await delay(300);
  await ensureContentScript(tabId);
  notifyTab(tabId, { type: "KLAR_LOADING", stage: "extracting", message: "Extracting factual claims…" });

  startKeepAlive();
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  try {
    // ── Phase 1: Extract claims ──
    const extractStart = Date.now();
    const extractRes = await fetchWithRetry(`${KLAR.API_BASE}/api/extension/extract`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...extractBody, analyses: analyses || ["fact-check"] }),
    });

    const extractData = await extractRes.json().catch(() => ({}));

    if (!extractRes.ok) {
      const errorCode = extractData.error_code || "server_error";
      const errorMsg = extractData.error || `Server returned ${extractRes.status}`;
      console.error("[KLAR] Phase 1 error:", errorCode, errorMsg);
      notifyTab(tabId, { type: "KLAR_ERROR", error: errorMsg, errorCode, status: extractRes.status });
      return { error: errorMsg };
    }

    const claims = extractData.claims || [];

    if (claims.length === 0) {
      // No claims, but maybe we have analysis-only results
      if (extractData.ai_detection || extractData.bias || extractData.plagiarism) {
        const analysisResult = {
          trust_score: 0,
          total_claims: 0,
          supported: 0,
          contradicted: 0,
          unverifiable: 0,
          claims: [],
          source_url: extractData.source_url,
          source_title: extractData.source_title,
          language: extractData.language,
          ...(extractData.ai_detection && { ai_detection: extractData.ai_detection }),
          ...(extractData.bias && { bias: extractData.bias }),
          ...(extractData.plagiarism && { plagiarism: extractData.plagiarism }),
        };
        notifyTab(tabId, { type: "KLAR_RESULT", result: analysisResult });
        return analysisResult;
      }
      notifyTab(tabId, { type: "KLAR_ERROR", error: "No factual claims found in this text.", errorCode: "no_claims" });
      return { error: "No claims" };
    }

    // Notify: claims found, starting verification
    notifyTab(tabId, {
      type: "KLAR_PROGRESS",
      stage: "judging",
      message: `Found ${claims.length} claims — verifying…`,
      total: claims.length,
      completed: 0,
    });

    // ── Phase 2: Judge each claim (parallel, limited concurrency) ──
    const language = extractData.language || "en";
    const judgedClaims = [];
    let supported = 0, contradicted = 0, unverifiable = 0;

    for (let i = 0; i < claims.length; i += JUDGE_CONCURRENCY) {
      const batch = claims.slice(i, i + JUDGE_CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(async (claim) => {
          try {
            const res = await fetchWithRetry(`${KLAR.API_BASE}/api/extension/judge`, {
              method: "POST",
              headers,
              body: JSON.stringify({ claim, language }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              // Claim failed — mark as unverifiable rather than crashing
              return {
                text: claim.claim_text,
                verdict: "unverifiable",
                confidence: 0,
                reasoning: data.error || "Could not verify this claim",
                sources: [],
              };
            }
            return {
              text: data.claim_text,
              verdict: data.verdict,
              confidence: data.confidence,
              reasoning: data.reasoning,
              recommendation: data.recommendation,
              sources: data.sources || [],
              position_start: data.position_start,
              position_end: data.position_end,
            };
          } catch {
            return {
              text: claim.claim_text,
              verdict: "unverifiable",
              confidence: 0,
              reasoning: "Request failed — could not verify this claim",
              sources: [],
            };
          }
        })
      );

      for (const r of batchResults) {
        judgedClaims.push(r);
        if (r.verdict === "supported") supported++;
        else if (r.verdict === "contradicted") contradicted++;
        else unverifiable++;
      }

      // Progressive update
      notifyTab(tabId, {
        type: "KLAR_PROGRESS",
        stage: "judging",
        message: `Verified ${judgedClaims.length} of ${claims.length} claims…`,
        total: claims.length,
        completed: judgedClaims.length,
        partialClaims: judgedClaims,
      });
    }

    // ── Final result ──
    const totalClaims = judgedClaims.length;
    // Trust score: ratio of supported to verifiable claims (unverifiable excluded)
    // This ensures unverified claims don't penalize the score the same as contradictions
    const verifiable = supported + contradicted;
    const trustScore = verifiable > 0 ? Math.round((supported / verifiable) * 100) : (totalClaims > 0 ? 50 : 0);

    const finalResult = {
      trust_score: trustScore,
      total_claims: totalClaims,
      supported,
      contradicted,
      unverifiable,
      claims: judgedClaims,
      source_url: extractData.source_url,
      source_title: extractData.source_title,
      language,
      ...(extractData.ai_detection && { ai_detection: extractData.ai_detection }),
      ...(extractData.bias && { bias: extractData.bias }),
      ...(extractData.plagiarism && { plagiarism: extractData.plagiarism }),
    };

    notifyTab(tabId, { type: "KLAR_RESULT", result: finalResult });
    return finalResult;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Verification failed";
    console.error("[KLAR] Pipeline error:", error);
    const isTimeout = error.includes("timed out") || error.includes("timeout");
    const isNetwork = error.includes("Failed to fetch") || error.includes("NetworkError");
    notifyTab(tabId, {
      type: "KLAR_ERROR",
      error,
      errorCode: isTimeout ? "timeout" : isNetwork ? "network" : "unknown",
    });
    return { error };
  } finally {
    stopKeepAlive();
  }
}

async function verifyText(text, tabId, analyses) {
  if (text.length < KLAR.MIN_TEXT_LENGTH) {
    const msg = `Text too short. Select at least ${KLAR.MIN_TEXT_LENGTH} characters.`;
    notifyTab(tabId, { type: "KLAR_ERROR", error: msg, errorCode: "text_too_short" });
    return { error: "Text too short" };
  }
  return runTwoPhaseVerification(tabId, { text: text.slice(0, KLAR.MAX_TEXT_LENGTH) }, analyses);
}

async function verifyUrl(url, tabId, analyses) {
  return runTwoPhaseVerification(tabId, { url }, analyses);
}

// ─── Persistent state store — sidepanel can request this even if it opens late ───
let latestState = { type: "KLAR_IDLE" };

function notifyTab(tabId, message) {
  latestState = message;

  if (tabId) {
    chrome.tabs.sendMessage(tabId, message).catch(() => {});
  }
  // Broadcast to side panel with small delay for reliability
  setTimeout(() => {
    chrome.runtime.sendMessage(message).catch(() => {});
  }, 50);
}
