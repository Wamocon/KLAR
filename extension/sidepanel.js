/**
 * KLAR Extension — Side Panel Script
 *
 * Primary results view. Renders full analysis results including:
 *   - Fact-check: trust score, claims with verdicts, reasoning, citations
 *   - Bias analysis: score bar, signals, examples
 *   - AI detection: verdict, signals, sentence/vocabulary stats
 *   - Plagiarism: originality %, matches with source links
 *   - Plagiarism: originality percentage + matches
 *   - Verification history
 */

const emptyEl = document.getElementById("empty");
const loadingEl = document.getElementById("loading");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");
const errorTitleEl = document.getElementById("errorTitle");
const errorMsgEl = document.getElementById("errorMessage");
const retryBtn = document.getElementById("retryBtn");
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
    showLoading(message.message);
  } else if (message.type === "KLAR_PROGRESS") {
    showLoadingProgress(message);
  } else if (message.type === "KLAR_RESULT") {
    showResult(message.result);
    addToHistory(message.result);
  } else if (message.type === "KLAR_ERROR") {
    showError(message.error, message.errorCode);
  }
});

// ─── On open: request latest state from background (handles race condition) ───
chrome.runtime.sendMessage({ type: "GET_LATEST_STATE" }, (state) => {
  if (chrome.runtime.lastError) return; // background not ready
  if (!state) return;
  if (state.type === "KLAR_LOADING") {
    showLoading(state.message);
  } else if (state.type === "KLAR_PROGRESS") {
    showLoadingProgress(state);
  } else if (state.type === "KLAR_RESULT") {
    showResult(state.result);
  } else if (state.type === "KLAR_ERROR") {
    showError(state.error, state.errorCode);
  }
});

// ─── State transitions ───

function showLoading(statusMessage) {
  emptyEl.style.display = "none";
  resultEl.classList.add("hidden");
  errorEl.style.display = "none";
  loadingEl.style.display = "flex";
  // Update loading status text if available
  const statusEl = loadingEl.querySelector(".loading-text");
  const subEl = loadingEl.querySelector(".loading-sub");
  if (statusEl) {
    statusEl.textContent = statusMessage || t("analyzingContent");
  }
  if (subEl) {
    subEl.textContent = statusMessage ? "" : t("analysisMayTake");
  }
}

function showLoadingProgress(data) {
  showLoading(data.message || t("verifiedXofY", String(data.completed || 0), String(data.total || "?")));
}

function showError(error, errorCode) {
  loadingEl.style.display = "none";
  emptyEl.style.display = "none";
  resultEl.classList.add("hidden");
  errorEl.style.display = "block";
  const info = categorizeError(error, errorCode);
  errorTitleEl.textContent = info.title;
  errorMsgEl.textContent = info.message;

  // Show retry button for retryable errors
  if (info.retryable) {
    retryBtn.style.display = "inline-block";
  } else {
    retryBtn.style.display = "none";
  }

  // Add hint if present
  const existingHint = errorEl.querySelector(".error-hint");
  if (existingHint) existingHint.remove();
  if (info.hint) {
    const hintEl = document.createElement("div");
    hintEl.className = "error-hint";
    hintEl.textContent = info.hint;
    errorEl.appendChild(hintEl);
  }
}

// ─── Retry: re-trigger the last verification from the active tab ───
retryBtn.addEventListener("click", async () => {
  retryBtn.style.display = "none";
  showLoading();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    // Ask background to re-verify the last captured content
    // The popup may be closed, so we trigger from content script context
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || "",
    });
    const selectedText = results?.[0]?.result || "";
    if (selectedText.length >= KLAR.MIN_TEXT_LENGTH) {
      chrome.runtime.sendMessage({
        type: "VERIFY_TEXT",
        text: selectedText,
        tabId: tab.id,
        analyses: ["fact-check"],
      });
    } else if (tab.url && tab.url.startsWith("http")) {
      chrome.runtime.sendMessage({
        type: "VERIFY_URL",
        url: tab.url,
        tabId: tab.id,
        analyses: ["fact-check"],
      });
    } else {
      showError(t("selectTextHintFull"), "no_content");
    }
  } catch {
    showError(t("retryFailed") || "Could not retry — try selecting text and using the popup.", "retry_failed");
  }
});

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
        <span class="score-label">${t("trustScoreLabel")}</span>
        <div class="score-desc">${t("trustScoreDesc")}</div>
        <div class="claims-bar">
          <span class="cb-s">${t("xSupported", String(result.supported || 0))}</span>
          <span class="cb-c">${t("xContradicted", String(result.contradicted || 0))}</span>
          <span class="cb-u">${t("xUnconfirmed", String(result.unverifiable || 0))}</span>
        </div>
      </div>
    `);

    // ── Smart analysis summary ──
    const sup = result.supported || 0;
    const con = result.contradicted || 0;
    const unv = result.unverifiable || 0;
    const total = sup + con + unv;
    const claims = result.claims || [];

    // Extract key claims for the summary
    const contradictedClaims = claims.filter(c => c.verdict === "contradicted");
    const supportedClaims = claims.filter(c => c.verdict === "supported");


    let summaryIcon, summaryBg, summaryTitle, summaryBody;
    const verifiable = sup + con;

    if (verifiable === 0) {
      // All unconfirmed
      summaryIcon = "\u2753"; summaryBg = "rgba(100,116,139,0.1)";
      summaryTitle = t("verdictCouldNotVerify");
      summaryBody = t("verdictCouldNotVerifyBody", String(total));
    } else if (con === 0 && sup > 0) {
      // All verifiable claims are supported
      summaryIcon = "\u2705"; summaryBg = "rgba(16,185,129,0.1)";
      summaryTitle = t("verdictReliable");
      summaryBody = sup === total
        ? t("verdictAllVerified", String(sup))
        : t("verdictMostVerified", String(sup), String(total), String(unv));
    } else if (sup === 0 && con > 0) {
      // All verifiable claims are contradicted
      summaryIcon = "\ud83d\uded1"; summaryBg = "rgba(239,68,68,0.1)";
      summaryTitle = t("verdictFactsWrong");
      summaryBody = t("verdictAllContradicted", String(con));
    } else {
      // Mixed — some supported, some contradicted
      summaryIcon = score >= 60 ? "\ud83d\udfe2" : score >= 40 ? "\ud83d\udfe0" : "\ud83d\udd34";
      summaryBg = score >= 60 ? "rgba(16,185,129,0.08)" : score >= 40 ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.1)";
      summaryTitle = score >= 60 ? t("verdictMostlyChecks") : score >= 40 ? t("verdictSomeFacts") : t("verdictSeveralWrong");
      summaryBody = t("verdictMixedBody", String(total), String(sup));
    }

    sections.push(`
      <div class="verdict-summary" style="background:${summaryBg}">
        <div class="verdict-header">${summaryIcon} ${summaryTitle}</div>
        <div class="verdict-text">${summaryBody}</div>
      </div>
    `);

    sections.push(`<div class="section-title">${t("claimsTitle")}</div>`);

    for (const c of result.claims) {
      const v = esc(c.verdict || "unverifiable");
      const label = v === "unverifiable" ? t("unconfirmedLabel") : v;
      sections.push(`
        <div class="claim-card ${v}">
          <div class="claim-header">
            <span class="claim-badge">${label}</span>
            ${c.confidence != null ? `<span class="claim-conf">${t("confidencePct", String(Math.round(c.confidence * 100)))}</span>` : ""}
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
          <span class="analysis-icon analysis-icon-bias"></span>
          <span class="analysis-title">${t("biasAnalysisTitle")}</span>
          <span class="analysis-badge" style="color:${color}">${esc(b.biasLevel || "unknown")}</span>
        </div>
        <div class="analysis-desc">${t("biasAnalysisDesc")}</div>
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
        ` : `<div class="analysis-clean">${t("noBiasSignals")}</div>`}
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
          <span class="analysis-icon analysis-icon-ai"></span>
          <span class="analysis-title">${t("aiDetectionTitle")}</span>
          <span class="analysis-badge" style="color:${color}">${esc(ai.verdict || "unknown")}</span>
        </div>
        <div class="analysis-desc">${t("aiDetectionResultDesc")}</div>
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
        ` : `<div class="analysis-clean">${t("noAiSignals")}</div>`}
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
          <span class="analysis-icon analysis-icon-plag"></span>
          <span class="analysis-title">${t("plagiarismCheckTitle")}</span>
          <span class="analysis-badge" style="color:${color}">${t("pctOriginal", String(p.originalityPercent))}</span>
        </div>
        <div class="analysis-desc">${t("plagiarismCheckDesc")}</div>
        <div class="bar-row">
          <div class="bar-track"><div class="bar-fill" style="width:${p.originalityPercent}%;background:${color}"></div></div>
          <span class="bar-value" style="color:${color}">${esc(p.verdict || "unknown")}</span>
        </div>
        ${p.matches && p.matches.length > 0 ? `
          <div>
            ${p.matches.slice(0, 5).map((m) => `
              <div class="match-item">
                <div class="match-header">
                  <span class="match-pct" style="color:${m.similarity > 50 ? "#ef4444" : "#eab308"}">${t("pctMatch", String(m.similarity))}</span>
                  <span class="match-source"><a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(m.matchedSource)}</a></span>
                </div>
                ${m.text ? `<div class="match-text">"${esc(m.text.slice(0, 120))}"</div>` : ""}
              </div>
            `).join("")}
          </div>
        ` : `<div class="analysis-clean">${t("noOverlaps")}</div>`}
        ${p.summary ? `<div class="analysis-summary">${esc(p.summary)}</div>` : ""}
      </div>
    `);
  }

  // ── Fallback ──
  if (sections.length === 0) {
    sections.push(`<div class="analysis-clean">${t("noResults")}</div>`);
  }

  // ── Processing time ──
  if (result.processing_time_ms) {
    sections.push(`<div class="proc-time">${t("completedInSec", (result.processing_time_ms / 1000).toFixed(1))}</div>`);
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
        const typeLabel = s.source_type === "wikipedia" ? t("sourceWiki") : s.source_type === "academic" ? t("sourceAcademic") : "";
        return `
          <a class="source-pill" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.snippet || s.title || "")}">
            <span class="source-pill-text">${esc(s.title || domain)}</span>
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

function categorizeError(error, errorCode) {
  const msg = (error || "").toLowerCase();
  const code = errorCode || "";

  if (code === "no_api_key" || msg.includes("api key")) {
    return { title: t("errApiKeyRequired"), message: t("errApiKeyRequiredDesc"), retryable: false };
  }
  if (code === "text_too_short" || msg.includes("text too short")) {
    return { title: t("textTooShort"), message: t("textTooShortDesc", String(KLAR.MIN_TEXT_LENGTH)), retryable: false };
  }
  if (code === "no_claims" || msg.includes("no factual claims")) {
    return {
      title: t("errNoClaimsTitle"),
      message: t("errNoClaimsDesc"),
      hint: t("errNoClaimsHint"),
      retryable: true,
    };
  }
  if (code === "timeout" || msg.includes("timed out") || msg.includes("timeout")) {
    return {
      title: t("errTimeoutTitle"),
      message: t("errTimeoutDesc"),
      hint: t("errTimeoutHint"),
      retryable: true,
    };
  }
  if (code === "network" || msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("net::")) {
    return {
      title: t("errConnectionTitle"),
      message: t("errConnectionDesc"),
      hint: t("errConnectionHint"),
      retryable: true,
    };
  }
  if (code === "extraction_failed" || msg.includes("failed to extract") || msg.includes("claim extraction") || msg.includes("failed to parse")) {
    return {
      title: t("errAnalysisTitle"),
      message: t("errAnalysisDesc"),
      hint: t("errAnalysisHint"),
      retryable: true,
    };
  }
  if (msg.includes("rate limit")) {
    return { title: t("errRateLimitTitle"), message: t("errRateLimitDesc"), retryable: true };
  }
  if (msg.includes("failed to fetch url") || msg.includes("restricted network") || msg.includes("could not extract meaningful content")) {
    return {
      title: t("errCannotReadPage"),
      message: t("errCannotReadPageDesc"),
      hint: t("errCannotReadPageHint"),
      retryable: true,
    };
  }
  if (msg.includes("prompt manipulation")) {
    return {
      title: t("errContentBlocked"),
      message: t("errContentBlockedDesc"),
      hint: t("errContentBlockedHint"),
      retryable: false,
    };
  }
  if (msg.includes("quota") || msg.includes("resource_exhausted") || code === "quota_exceeded") {
    return {
      title: t("errQuotaTitle"),
      message: t("errQuotaDesc"),
      hint: t("errQuotaHint"),
      retryable: true,
    };
  }
  if (msg.includes("server returned 5") || code === "pipeline_error" || code === "server_error") {
    return {
      title: t("errServerTitle"),
      message: error || t("unexpectedError"),
      hint: t("errServerHint"),
      retryable: true,
    };
  }
  return {
    title: t("verificationFailed"),
    message: error || t("unexpectedError"),
    retryable: true,
  };
}

// ─── History ───

function addToHistory(result) {
  const entry = {
    score: Math.round(result.trust_score || 0),
    claims: result.total_claims || 0,
    preview: result.claims?.[0]?.text?.slice(0, 80) || "Analysis",
    time: Date.now(),
    hasAnalysis: !!(result.bias || result.ai_detection || result.plagiarism),
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
