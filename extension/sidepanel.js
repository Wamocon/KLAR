/**
 * KLAR Extension — Side Panel Script
 *
 * Primary results view. Renders full analysis results including:
 *   - Fact-check: trust score, claims with verdicts, reasoning, citations
 *   - Bias analysis: score bar, signals, examples
 *   - AI detection: verdict, signals, sentence/vocabulary stats
 *   - Plagiarism: originality %, matches with source links
 *   - Framework eval: MECE/Red Team/BLUF/Pre-Mortem scores
 *   - Verification history
 */

const emptyEl = document.getElementById("empty");
const loadingEl = document.getElementById("loading");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");
const errorTitleEl = document.getElementById("errorTitle");
const errorMsgEl = document.getElementById("errorMessage");
const historyEl = document.getElementById("history");
const historyListEl = document.getElementById("historyList");

// Set app link
const lang = (chrome.i18n.getUILanguage() || "en").startsWith("de") ? "de" : "en";
document.getElementById("openAppBtn").href = `${KLAR.API_BASE}/${lang}/dashboard`;

let verificationHistory = [];

// Load history from storage
chrome.storage.local.get(["klarHistory"], (data) => {
  verificationHistory = data.klarHistory || [];
  renderHistory();
});

// ─── Message listener (from background service worker) ───
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

// ─── State transitions ───

function showLoading() {
  emptyEl.style.display = "none";
  resultEl.classList.add("hidden");
  errorEl.style.display = "none";
  loadingEl.style.display = "flex";
}

function showError(error) {
  loadingEl.style.display = "none";
  emptyEl.style.display = "none";
  resultEl.classList.add("hidden");
  errorEl.style.display = "block";
  const info = categorizeError(error);
  errorTitleEl.textContent = info.title;
  errorMsgEl.textContent = info.message;
}

// ─── Main result renderer ───

function showResult(result) {
  loadingEl.style.display = "none";
  emptyEl.style.display = "none";
  errorEl.style.display = "none";
  resultEl.classList.remove("hidden");

  const sections = [];

  // ── Fact-Check: Score + Claims ──
  if (result.claims && result.claims.length > 0) {
    const score = Math.round(result.trust_score || 0);
    const color = scoreColor(score);

    sections.push(`
      <div class="score-card">
        <span class="score-ring" style="color:${color}">${score}%</span>
        <span class="score-label">Trust Score</span>
        <div class="claims-bar">
          <span class="cb-s">${result.supported || 0} supported</span>
          <span class="cb-c">${result.contradicted || 0} contradicted</span>
          <span class="cb-u">${result.unverifiable || 0} unknown</span>
        </div>
      </div>
    `);

    sections.push(`<div class="section-title">Claims</div>`);

    for (const c of result.claims) {
      const v = esc(c.verdict || "unverifiable");
      sections.push(`
        <div class="claim-card ${v}">
          <div class="claim-header">
            <span class="claim-badge">${v}</span>
            ${c.confidence != null ? `<span class="claim-conf">${Math.round(c.confidence * 100)}% confidence</span>` : ""}
          </div>
          <div class="claim-text">${esc(c.text)}</div>
          ${c.reasoning ? `<div class="claim-reasoning">${esc(c.reasoning)}</div>` : ""}
          ${renderSources(c.sources)}
        </div>
      `);
    }
  }

  // ── Bias Analysis ──
  if (result.bias) {
    const b = result.bias;
    const color = invertColor(b.overallScore);
    sections.push(`
      <div class="analysis-card">
        <div class="analysis-header">
          <span class="analysis-icon">⚖️</span>
          <span class="analysis-title">Bias Analysis</span>
          <span class="analysis-badge" style="color:${color}">${esc(b.biasLevel || "unknown")}</span>
        </div>
        <div class="bar-row">
          <div class="bar-track"><div class="bar-fill" style="width:${b.overallScore}%;background:${color}"></div></div>
          <span class="bar-value" style="color:${color}">${b.overallScore}/100</span>
        </div>
        ${b.signals && b.signals.length > 0 ? `
          <div class="signal-list">
            ${b.signals.slice(0, 6).map((s) => `
              <div class="signal-item ${esc(s.severity)}">
                <div class="signal-type">${esc(s.type.replace(/_/g, " "))}</div>
                <div class="signal-detail">${esc(s.detail)}</div>
                ${s.examples && s.examples.length > 0 ? `<div class="signal-examples">${s.examples.slice(0, 3).map(esc).join(", ")}</div>` : ""}
              </div>
            `).join("")}
          </div>
        ` : `<div class="analysis-clean">No significant bias signals detected.</div>`}
        ${b.summary ? `<div class="analysis-summary">${esc(b.summary)}</div>` : ""}
      </div>
    `);
  }

  // ── AI Detection ──
  if (result.ai_detection) {
    const ai = result.ai_detection;
    const color = ai.overallScore <= 30 ? "#22c55e" : ai.overallScore <= 60 ? "#eab308" : "#ef4444";
    sections.push(`
      <div class="analysis-card">
        <div class="analysis-header">
          <span class="analysis-icon">🤖</span>
          <span class="analysis-title">AI Detection</span>
          <span class="analysis-badge" style="color:${color}">${esc(ai.verdict || "unknown")}</span>
        </div>
        <div class="bar-row">
          <div class="bar-track"><div class="bar-fill" style="width:${ai.overallScore}%;background:${color}"></div></div>
          <span class="bar-value" style="color:${color}">${ai.overallScore}/100</span>
        </div>
        ${ai.signals && ai.signals.length > 0 ? `
          <div class="signal-list">
            ${ai.signals.slice(0, 5).map((s) => `
              <div class="signal-item">
                <div class="signal-type">${esc(s.type.replace(/_/g, " "))}</div>
                <div class="signal-detail">${esc(s.detail)}</div>
              </div>
            `).join("")}
          </div>
        ` : `<div class="analysis-clean">No strong AI-generation signals detected.</div>`}
        ${ai.summary ? `<div class="analysis-summary">${esc(ai.summary)}</div>` : ""}
      </div>
    `);
  }

  // ── Plagiarism ──
  if (result.plagiarism) {
    const p = result.plagiarism;
    const color = p.originalityPercent >= 80 ? "#22c55e" : p.originalityPercent >= 50 ? "#eab308" : "#ef4444";
    sections.push(`
      <div class="analysis-card">
        <div class="analysis-header">
          <span class="analysis-icon">📋</span>
          <span class="analysis-title">Plagiarism Check</span>
          <span class="analysis-badge" style="color:${color}">${p.originalityPercent}% original</span>
        </div>
        <div class="bar-row">
          <div class="bar-track"><div class="bar-fill" style="width:${p.originalityPercent}%;background:${color}"></div></div>
          <span class="bar-value" style="color:${color}">${esc(p.verdict || "unknown")}</span>
        </div>
        ${p.matches && p.matches.length > 0 ? `
          <div>
            ${p.matches.slice(0, 5).map((m) => `
              <div class="match-item">
                <div class="match-header">
                  <span class="match-pct" style="color:${m.similarity > 50 ? "#ef4444" : "#eab308"}">${m.similarity}% match</span>
                  <span class="match-source"><a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(m.matchedSource)}</a></span>
                </div>
                ${m.text ? `<div class="match-text">"${esc(m.text.slice(0, 120))}"</div>` : ""}
              </div>
            `).join("")}
          </div>
        ` : `<div class="analysis-clean">No significant text overlaps found.</div>`}
        ${p.summary ? `<div class="analysis-summary">${esc(p.summary)}</div>` : ""}
      </div>
    `);
  }

  // ── Framework Evaluation ──
  if (result.framework) {
    const fw = result.framework;
    const color = fw.overallScore >= 70 ? "#22c55e" : fw.overallScore >= 45 ? "#eab308" : "#ef4444";
    sections.push(`
      <div class="analysis-card">
        <div class="analysis-header">
          <span class="analysis-icon">🔬</span>
          <span class="analysis-title">Framework Evaluation</span>
          <span class="analysis-badge" style="color:${color}">Grade ${esc(fw.overallGrade || "?")}</span>
        </div>
        ${fw.frameworks && fw.frameworks.length > 0 ? `
          <div class="fw-grid">
            ${fw.frameworks.map((f) => {
              const c = f.score >= 60 ? "#22c55e" : f.score >= 40 ? "#eab308" : "#ef4444";
              return `
                <div class="fw-item">
                  <span class="fw-name">${esc(f.framework)}</span>
                  <div class="bar-track bar-track-sm" style="flex:1"><div class="bar-fill" style="width:${f.score}%;background:${c}"></div></div>
                  <span class="fw-score" style="color:${c}">${f.score}</span>
                  <span class="fw-pass">${f.passed ? "✓" : "✗"}</span>
                </div>`;
            }).join("")}
          </div>
        ` : ""}
        ${fw.strengths && fw.strengths.length > 0 ? `
          <div class="analysis-summary">
            <strong>Strengths:</strong> ${fw.strengths.map(esc).join(" · ")}
          </div>
        ` : ""}
        ${fw.weaknesses && fw.weaknesses.length > 0 ? `
          <div class="analysis-summary" style="border-top:none;margin-top:4px;padding-top:0;">
            <strong>Weaknesses:</strong> ${fw.weaknesses.map(esc).join(" · ")}
          </div>
        ` : ""}
      </div>
    `);
  }

  // ── Fallback ──
  if (sections.length === 0) {
    sections.push(`<div class="analysis-clean">No analysis results returned. Try selecting more text.</div>`);
  }

  // ── Processing time ──
  if (result.processing_time_ms) {
    sections.push(`<div class="proc-time">Completed in ${(result.processing_time_ms / 1000).toFixed(1)}s</div>`);
  }

  resultEl.innerHTML = sections.join("");
}

// ─── Source pills ───

function renderSources(sources) {
  if (!sources || sources.length === 0) return "";
  return `
    <div class="claim-sources">
      ${sources.slice(0, 5).map((s) => {
        let domain = "";
        try { domain = new URL(s.url).hostname.replace(/^www\./, ""); } catch { domain = s.url; }
        const typeLabel = s.source_type === "wikipedia" ? "Wiki" : s.source_type === "academic" ? "Academic" : "";
        return `
          <a class="source-pill" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.snippet || s.title || "")}">
            🔗 <span class="source-pill-text">${esc(s.title || domain)}</span>
            ${typeLabel ? `<span class="source-type">${typeLabel}</span>` : ""}
          </a>`;
      }).join("")}
    </div>
  `;
}

// ─── Color helpers ───

function scoreColor(score) {
  return score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
}

function invertColor(score) {
  return score <= 25 ? "#22c55e" : score <= 50 ? "#eab308" : "#ef4444";
}

// ─── Error categorizer ───

function categorizeError(error) {
  const msg = (error || "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("net::")) {
    return { title: "No internet connection", message: "Check your network and try again." };
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return { title: "Request timed out", message: "The server took too long. Try with shorter text or fewer analyses." };
  }
  if (msg.includes("rate limit")) {
    return { title: "Rate limit reached", message: "Too many requests. Wait a moment and retry." };
  }
  if (msg.includes("api key")) {
    return { title: "API key issue", message: "Open the KLAR popup to configure your API key." };
  }
  if (msg.includes("text too short")) {
    return { title: "Text too short", message: `Select at least ${KLAR.MIN_TEXT_LENGTH} characters.` };
  }
  if (msg.includes("no factual claims")) {
    return { title: "No verifiable claims found", message: "The selected text doesn't contain factual claims. Try selecting text with specific facts, numbers, or dates." };
  }
  if (msg.includes("failed to extract") || msg.includes("claim extraction")) {
    return { title: "Extraction failed", message: "Could not analyze this text. Try selecting a different passage." };
  }
  if (msg.includes("failed to fetch url") || msg.includes("restricted network")) {
    return { title: "Cannot access page", message: "The server couldn't reach this URL. Try using Selection or Full Page mode instead." };
  }
  return { title: "Verification failed", message: error || "An unexpected error occurred. Please try again." };
}

// ─── History ───

function addToHistory(result) {
  const entry = {
    score: Math.round(result.trust_score || 0),
    claims: result.total_claims || 0,
    preview: result.claims?.[0]?.text?.slice(0, 80) || "Analysis",
    time: Date.now(),
    hasAnalysis: !!(result.bias || result.ai_detection || result.plagiarism || result.framework),
    // Store the full result for replay
    fullResult: result,
  };
  verificationHistory.unshift(entry);
  verificationHistory = verificationHistory.slice(0, 15);
  chrome.storage.local.set({ klarHistory: verificationHistory });
  renderHistory();
}

function renderHistory() {
  if (verificationHistory.length === 0) {
    historyEl.classList.add("hidden");
    return;
  }
  historyEl.classList.remove("hidden");
  historyListEl.innerHTML = verificationHistory.map((h, i) => {
    const color = scoreColor(h.score);
    const ago = timeAgo(h.time);
    return `
      <div class="history-item" data-index="${i}">
        <span class="history-text">${esc(h.preview)}</span>
        <span class="history-score" style="color:${color}">${h.score}%</span>
        <span class="history-time">${ago}</span>
      </div>
    `;
  }).join("");

  // Click to replay a past result
  historyListEl.querySelectorAll(".history-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.index);
      if (verificationHistory[idx]?.fullResult) {
        showResult(verificationHistory[idx].fullResult);
      }
    });
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

// ─── Escaping ───

function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}
