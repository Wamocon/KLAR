/**
 * KLAR Extension — Side Panel Script
 *
 * Shows live verification results, loading state, errors, and history.
 */

const emptyEl = document.getElementById("empty");
const loadingEl = document.getElementById("loading");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");
const errorTitleEl = document.getElementById("errorTitle");
const errorMsgEl = document.getElementById("errorMessage");
const historyEl = document.getElementById("history");
const historyListEl = document.getElementById("historyList");

let verificationHistory = [];

// Load history from storage
chrome.storage.local.get(["klarHistory"], (data) => {
  verificationHistory = data.klarHistory || [];
  renderHistory();
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "KLAR_LOADING") {
    showLoading();
  } else if (message.type === "KLAR_RESULT") {
    showResult(message.result);
    addToHistory(message.result);
  } else if (message.type === "KLAR_ERROR") {
    showError(message.error);
  }
});

function showLoading() {
  emptyEl.style.display = "none";
  resultEl.style.display = "none";
  errorEl.style.display = "none";
  loadingEl.style.display = "flex";
}

function showResult(result) {
  loadingEl.style.display = "none";
  emptyEl.style.display = "none";
  errorEl.style.display = "none";
  resultEl.style.display = "block";

  const score = Math.round(result.trust_score || 0);
  const scoreColor = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  resultEl.innerHTML = `
    <div class="score-section">
      <span class="score-number" style="color:${scoreColor}">${score}%</span>
      <span class="score-label">Trust Score</span>
    </div>
    <div class="claims-bar">
      <span class="cb-supported">${result.supported || 0} supported</span>
      <span class="cb-contradicted">${result.contradicted || 0} contradicted</span>
      <span class="cb-unknown">${result.unverifiable || 0} unknown</span>
    </div>
    ${result.claims && result.claims.length > 0 ? `
      <div class="claims-list">
        ${result.claims.slice(0, KLAR.MAX_VISIBLE_CLAIMS).map((c) => `
          <div class="claim claim-${c.verdict}">
            <span class="claim-verdict">${c.verdict}</span>
            <span class="claim-text">${escapeHtml(c.text)}</span>
          </div>
        `).join("")}
        ${result.claims.length > KLAR.MAX_VISIBLE_CLAIMS ? `<p class="more-claims">+${result.claims.length - KLAR.MAX_VISIBLE_CLAIMS} more claims</p>` : ""}
      </div>
    ` : ""}
    ${result.processing_time_ms ? `<div class="proc-time">${(result.processing_time_ms / 1000).toFixed(1)}s</div>` : ""}
  `;
}

function showError(error) {
  loadingEl.style.display = "none";
  emptyEl.style.display = "none";
  resultEl.style.display = "none";
  errorEl.style.display = "block";

  const errorInfo = categorizeError(error);
  errorTitleEl.textContent = errorInfo.title;
  errorMsgEl.textContent = errorInfo.message;
}

function categorizeError(error) {
  const msg = (error || "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("net::")) {
    return { title: "No internet connection", message: "Check your network and try again." };
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return { title: "Request timed out", message: "The server took too long. Try with shorter text." };
  }
  if (msg.includes("rate limit")) {
    return { title: "Rate limit reached", message: "Too many requests. Wait a moment and try again." };
  }
  if (msg.includes("api key")) {
    return { title: "API key issue", message: "Open the extension popup to configure your API key." };
  }
  if (msg.includes("text too short")) {
    return { title: "Text too short", message: `Select at least ${KLAR.MIN_TEXT_LENGTH} characters to verify.` };
  }
  return { title: "Verification failed", message: error || "An unexpected error occurred." };
}

function addToHistory(result) {
  const entry = {
    score: Math.round(result.trust_score || 0),
    claims: result.total_claims || 0,
    preview: result.claims?.[0]?.text?.slice(0, 60) || "Verification",
    time: Date.now(),
  };
  verificationHistory.unshift(entry);
  verificationHistory = verificationHistory.slice(0, 10); // keep last 10
  chrome.storage.local.set({ klarHistory: verificationHistory });
  renderHistory();
}

function renderHistory() {
  if (verificationHistory.length === 0) {
    historyEl.style.display = "none";
    return;
  }
  historyEl.style.display = "block";
  historyListEl.innerHTML = verificationHistory.map((h) => {
    const color = h.score >= 80 ? "#22c55e" : h.score >= 50 ? "#eab308" : "#ef4444";
    return `
      <div class="history-item">
        <span class="history-text">${escapeHtml(h.preview)}</span>
        <span class="history-score" style="color:${color}">${h.score}%</span>
      </div>
    `;
  }).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
