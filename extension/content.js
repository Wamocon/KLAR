/**
 * KLAR Extension — Content Script
 *
 * Injects a floating results panel into the page.
 * Listens for messages from the background service worker.
 */

let klarPanel = null;

function createPanel() {
  if (klarPanel) return klarPanel;

  klarPanel = document.createElement("div");
  klarPanel.id = "klar-extension-panel";
  klarPanel.innerHTML = `
    <div class="klar-panel-header">
      <span class="klar-logo">KLAR</span>
      <button class="klar-close" aria-label="Close">&times;</button>
    </div>
    <div class="klar-panel-body">
      <div class="klar-loading" style="display:none;">
        <div class="klar-spinner"></div>
        <span>Verifying…</span>
      </div>
      <div class="klar-result" style="display:none;"></div>
      <div class="klar-error" style="display:none;"></div>
    </div>
  `;
  document.body.appendChild(klarPanel);

  klarPanel.querySelector(".klar-close").addEventListener("click", () => {
    klarPanel.style.display = "none";
  });

  return klarPanel;
}

function showLoading() {
  const panel = createPanel();
  panel.style.display = "block";
  panel.querySelector(".klar-loading").style.display = "flex";
  panel.querySelector(".klar-result").style.display = "none";
  panel.querySelector(".klar-error").style.display = "none";
}

function showResult(result) {
  const panel = createPanel();
  panel.style.display = "block";
  panel.querySelector(".klar-loading").style.display = "none";
  panel.querySelector(".klar-error").style.display = "none";

  const score = Math.round(result.trust_score || 0);
  const scoreColor = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  const resultDiv = panel.querySelector(".klar-result");
  resultDiv.style.display = "block";
  resultDiv.innerHTML = `
    <div class="klar-score" style="color:${scoreColor}">
      <span class="klar-score-number">${score}%</span>
      <span class="klar-score-label">Trust Score</span>
    </div>
    <div class="klar-claims-summary">
      <span class="klar-supported">${result.supported || 0} supported</span>
      <span class="klar-contradicted">${result.contradicted || 0} contradicted</span>
      <span class="klar-unverifiable">${result.unverifiable || 0} unknown</span>
    </div>
    ${result.claims && result.claims.length > 0 ? `
      <div class="klar-claims">
        ${result.claims.slice(0, KLAR.MAX_VISIBLE_CLAIMS).map((c) => `
          <div class="klar-claim klar-claim-${c.verdict}">
            <span class="klar-claim-verdict">${c.verdict}</span>
            <span class="klar-claim-text">${escapeHtml(c.text)}</span>
          </div>
        `).join("")}
        ${result.claims.length > KLAR.MAX_VISIBLE_CLAIMS ? `<p class="klar-more">+${result.claims.length - KLAR.MAX_VISIBLE_CLAIMS} more claims</p>` : ""}
      </div>
    ` : ""}
    <div class="klar-time">${result.processing_time_ms ? `${(result.processing_time_ms / 1000).toFixed(1)}s` : ""}</div>
  `;
}

function showError(error) {
  const panel = createPanel();
  panel.style.display = "block";
  panel.querySelector(".klar-loading").style.display = "none";
  panel.querySelector(".klar-result").style.display = "none";

  const errorInfo = categorizeError(error);
  const errorDiv = panel.querySelector(".klar-error");
  errorDiv.style.display = "block";
  errorDiv.innerHTML = `
    <div class="klar-error-icon">${errorInfo.icon}</div>
    <div class="klar-error-title">${escapeHtml(errorInfo.title)}</div>
    <div class="klar-error-message">${escapeHtml(errorInfo.message)}</div>
  `;
}

function categorizeError(error) {
  const msg = (error || "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("net::")) {
    return { icon: "📡", title: "No internet connection", message: "Check your network and try again." };
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return { icon: "⏱️", title: "Request timed out", message: "The server took too long. Try with shorter text." };
  }
  if (msg.includes("rate limit")) {
    return { icon: "🚦", title: "Rate limit reached", message: "Too many requests. Wait a moment and retry." };
  }
  if (msg.includes("api key")) {
    return { icon: "🔑", title: "API key issue", message: "Open the KLAR popup to configure your key." };
  }
  if (msg.includes("text too short")) {
    return { icon: "📝", title: "Text too short", message: `Select at least ${KLAR.MIN_TEXT_LENGTH} characters.` };
  }
  if (msg.includes("http 5") || msg.includes("internal server")) {
    return { icon: "🔧", title: "Server error", message: "KLAR is having issues. Try again shortly." };
  }
  return { icon: "⚠️", title: "Verification failed", message: error || "An unexpected error occurred." };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "KLAR_LOADING") {
    showLoading();
  } else if (message.type === "KLAR_RESULT") {
    showResult(message.result);
  } else if (message.type === "KLAR_ERROR") {
    showError(message.error);
  }
});
