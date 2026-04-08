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
  const verifyingText = chrome.i18n.getMessage("verifying") || "Verifying…";
  klarPanel.innerHTML = `
    <div class="klar-panel-header">
      <span class="klar-logo">KLAR</span>
      <button class="klar-close" aria-label="Close">&times;</button>
    </div>
    <div class="klar-panel-body">
      <div class="klar-loading" style="display:none;">
        <div class="klar-spinner"></div>
        <span>${escapeHtml(verifyingText)}</span>
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

  const resultDiv = panel.querySelector(".klar-result");
  resultDiv.style.display = "block";

  const sections = [];

  // ─── Fact-Check results (if claims exist) ───
  if (result.claims && result.claims.length > 0) {
    const score = Math.round(result.trust_score || 0);
    const scoreColor = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

    sections.push(`
      <div class="klar-score" style="color:${scoreColor}">
        <span class="klar-score-number">${score}%</span>
        <span class="klar-score-label">Trust Score</span>
      </div>
      <div class="klar-claims-summary">
        <span class="klar-supported">${result.supported || 0} supported</span>
        <span class="klar-contradicted">${result.contradicted || 0} contradicted</span>
        <span class="klar-unverifiable">${result.unverifiable || 0} unknown</span>
      </div>
      <div class="klar-claims">
        ${result.claims.slice(0, KLAR.MAX_VISIBLE_CLAIMS).map((c) => `
          <div class="klar-claim klar-claim-${escapeHtml(c.verdict)}">
            <div class="klar-claim-header">
              <span class="klar-claim-verdict">${escapeHtml(c.verdict)}</span>
              ${c.confidence != null ? `<span class="klar-claim-conf">${Math.round(c.confidence * 100)}%</span>` : ""}
            </div>
            <div class="klar-claim-text">${escapeHtml(c.text)}</div>
            ${c.reasoning ? `<div class="klar-claim-reasoning">${escapeHtml(c.reasoning)}</div>` : ""}
            ${c.sources && c.sources.length > 0 ? `
              <div class="klar-claim-sources">
                ${c.sources.slice(0, 3).map((s) => `
                  <a class="klar-source-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(s.title || s.url)}">
                    <span class="klar-source-icon">SRC</span>
                    <span class="klar-source-title">${escapeHtml(s.title || new URL(s.url).hostname)}</span>
                  </a>
                `).join("")}
              </div>
            ` : ""}
          </div>
        `).join("")}
        ${result.claims.length > KLAR.MAX_VISIBLE_CLAIMS ? `<p class="klar-more">+${result.claims.length - KLAR.MAX_VISIBLE_CLAIMS} more claims</p>` : ""}
      </div>
    `);
  }

  // ─── Bias Analysis ───
  if (result.bias) {
    const b = result.bias;
    const biasColor = b.overallScore <= 25 ? "#22c55e" : b.overallScore <= 50 ? "#eab308" : "#ef4444";
    sections.push(`
      <div class="klar-analysis-card">
        <div class="klar-analysis-header">
          <span class="klar-analysis-icon klar-icon-bias">B</span>
          <span class="klar-analysis-title">Bias Analysis</span>
          <span class="klar-analysis-badge" style="color:${biasColor}">${escapeHtml(b.biasLevel || "unknown")}</span>
        </div>
        <div class="klar-analysis-score-bar">
          <div class="klar-bar-track"><div class="klar-bar-fill" style="width:${b.overallScore}%;background:${biasColor}"></div></div>
          <span class="klar-bar-label" style="color:${biasColor}">${b.overallScore}/100</span>
        </div>
        ${b.signals && b.signals.length > 0 ? `
          <div class="klar-analysis-signals">
            ${b.signals.slice(0, 4).map((s) => `
              <div class="klar-signal klar-signal-${escapeHtml(s.severity)}">
                <span class="klar-signal-type">${escapeHtml(s.type.replace(/_/g, " "))}</span>
                <span class="klar-signal-detail">${escapeHtml(s.detail)}</span>
              </div>
            `).join("")}
          </div>
        ` : `<div class="klar-analysis-clean">No significant bias signals detected.</div>`}
        ${b.summary ? `<div class="klar-analysis-summary">${escapeHtml(b.summary)}</div>` : ""}
      </div>
    `);
  }

  // ─── AI Detection ───
  if (result.ai_detection) {
    const ai = result.ai_detection;
    const aiColor = ai.overallScore <= 30 ? "#22c55e" : ai.overallScore <= 60 ? "#eab308" : "#ef4444";
    sections.push(`
      <div class="klar-analysis-card">
        <div class="klar-analysis-header">
          <span class="klar-analysis-icon klar-icon-ai">AI</span>
          <span class="klar-analysis-title">AI Detection</span>
          <span class="klar-analysis-badge" style="color:${aiColor}">${escapeHtml(ai.verdict || "unknown")}</span>
        </div>
        <div class="klar-analysis-score-bar">
          <div class="klar-bar-track"><div class="klar-bar-fill" style="width:${ai.overallScore}%;background:${aiColor}"></div></div>
          <span class="klar-bar-label" style="color:${aiColor}">${ai.overallScore}/100</span>
        </div>
        ${ai.signals && ai.signals.length > 0 ? `
          <div class="klar-analysis-signals">
            ${ai.signals.slice(0, 4).map((s) => `
              <div class="klar-signal">
                <span class="klar-signal-type">${escapeHtml(s.type.replace(/_/g, " "))}</span>
                <span class="klar-signal-detail">${escapeHtml(s.detail)}</span>
              </div>
            `).join("")}
          </div>
        ` : `<div class="klar-analysis-clean">No strong AI signals detected.</div>`}
        ${ai.summary ? `<div class="klar-analysis-summary">${escapeHtml(ai.summary)}</div>` : ""}
      </div>
    `);
  }

  // ─── Plagiarism ───
  if (result.plagiarism) {
    const p = result.plagiarism;
    const origColor = p.originalityPercent >= 80 ? "#22c55e" : p.originalityPercent >= 50 ? "#eab308" : "#ef4444";
    sections.push(`
      <div class="klar-analysis-card">
        <div class="klar-analysis-header">
          <span class="klar-analysis-icon klar-icon-plag">PL</span>
          <span class="klar-analysis-title">Plagiarism Check</span>
          <span class="klar-analysis-badge" style="color:${origColor}">${p.originalityPercent}% original</span>
        </div>
        <div class="klar-analysis-score-bar">
          <div class="klar-bar-track"><div class="klar-bar-fill" style="width:${p.originalityPercent}%;background:${origColor}"></div></div>
          <span class="klar-bar-label" style="color:${origColor}">${escapeHtml(p.verdict || "unknown")}</span>
        </div>
        ${p.matches && p.matches.length > 0 ? `
          <div class="klar-analysis-signals">
            ${p.matches.slice(0, 3).map((m) => `
              <div class="klar-signal klar-signal-${m.similarity > 50 ? "high" : "medium"}">
                <span class="klar-signal-type">${m.similarity}% match</span>
                <a class="klar-source-link" href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">
                  <span class="klar-source-title">${escapeHtml(m.matchedSource)}</span>
                </a>
              </div>
            `).join("")}
          </div>
        ` : `<div class="klar-analysis-clean">No significant overlaps found.</div>`}
        ${p.summary ? `<div class="klar-analysis-summary">${escapeHtml(p.summary)}</div>` : ""}
      </div>
    `);
  }

  // ─── Framework Evaluation ───
  if (result.framework) {
    const fw = result.framework;
    const fwColor = fw.overallScore >= 70 ? "#22c55e" : fw.overallScore >= 45 ? "#eab308" : "#ef4444";
    sections.push(`
      <div class="klar-analysis-card">
        <div class="klar-analysis-header">
          <span class="klar-analysis-icon klar-icon-fw">FW</span>
          <span class="klar-analysis-title">Framework Eval</span>
          <span class="klar-analysis-badge" style="color:${fwColor}">Grade ${escapeHtml(fw.overallGrade || "?")}</span>
        </div>
        ${fw.frameworks && fw.frameworks.length > 0 ? `
          <div class="klar-fw-grid">
            ${fw.frameworks.map((f) => {
              const c = f.score >= 60 ? "#22c55e" : f.score >= 40 ? "#eab308" : "#ef4444";
              return `
                <div class="klar-fw-item">
                  <span class="klar-fw-name">${escapeHtml(f.framework)}</span>
                  <div class="klar-bar-track klar-bar-sm"><div class="klar-bar-fill" style="width:${f.score}%;background:${c}"></div></div>
                  <span class="klar-fw-score" style="color:${c}">${f.score}</span>
                </div>`;
            }).join("")}
          </div>
        ` : ""}
        ${fw.summary ? `<div class="klar-analysis-summary">${escapeHtml(fw.summary)}</div>` : ""}
      </div>
    `);
  }

  // ─── Fallback: no analysis results at all ───
  if (sections.length === 0) {
    sections.push(`<div class="klar-analysis-clean">No results returned — try selecting more text.</div>`);
  }

  // ─── Processing time ───
  if (result.processing_time_ms) {
    sections.push(`<div class="klar-time">${(result.processing_time_ms / 1000).toFixed(1)}s</div>`);
  }

  resultDiv.innerHTML = sections.join("");
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
    ${errorInfo.hint ? `<div class="klar-error-hint">${escapeHtml(errorInfo.hint)}</div>` : ""}
  `;
}

function categorizeError(error) {
  const msg = (error || "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("net::")) {
    return { icon: "📡", title: "Connection failed", message: "Could not reach the KLAR server.", hint: "Check your internet connection and try again." };
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return { icon: "⏱️", title: "Analysis timed out", message: "The server took too long to respond.", hint: "Try again — performance varies. If it persists, select a shorter text passage." };
  }
  if (msg.includes("rate limit")) {
    return { icon: "🚦", title: "Rate limit reached", message: "Too many requests. Wait a moment and retry." };
  }
  if (msg.includes("api key")) {
    return { icon: "🔑", title: "API key required", message: "Open the KLAR popup to configure your key." };
  }
  if (msg.includes("text too short")) {
    return { icon: "📝", title: "Text too short", message: `Select at least ${KLAR.MIN_TEXT_LENGTH} characters.` };
  }
  if (msg.includes("no factual claims")) {
    return { icon: "🔍", title: "No claims found", message: "No verifiable facts in this text.", hint: "Try selecting text with specific facts, numbers, or dates." };
  }
  if (msg.includes("prompt manipulation")) {
    return { icon: "🛡️", title: "Content blocked", message: "Text flagged as potential prompt injection.", hint: "Try selecting a smaller, cleaner portion of text." };
  }
  if (msg.includes("http 5") || msg.includes("server") || msg.includes("pipeline")) {
    return { icon: "🔧", title: "Server error", message: "KLAR had a temporary issue.", hint: "Try again in a few seconds." };
  }
  return { icon: "!", title: "Verification failed", message: error || "An unexpected error occurred." };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Ping from background to check if content script is alive
  if (message.type === "KLAR_PING") {
    sendResponse({ pong: true });
    return;
  }
  if (message.type === "KLAR_LOADING") {
    showLoading();
  } else if (message.type === "KLAR_RESULT") {
    showResult(message.result);
  } else if (message.type === "KLAR_ERROR") {
    showError(message.error);
  }
});
