/**
 * KLAR Extension — Popup Script
 *
 * Two-screen UX:
 *   Setup screen: Shown only when no API key. Validate against server → auto-transition.
 *   Main screen:  Selection preview, 6 analysis actions, 2 compliance actions, quick links, key management.
 */

// ─── DOM refs ───
const setupScreen = document.getElementById("setupScreen");
const mainScreen = document.getElementById("mainScreen");
const apiKeyInput = document.getElementById("apiKeyInput");
const toggleVis = document.getElementById("toggleVis");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const saveBtnText = document.getElementById("saveBtnText");
const saveSpinner = document.getElementById("saveSpinner");
const toastEl = document.getElementById("toast");
const selCard = document.getElementById("selectionCard");
const selCount = document.getElementById("selCount");
const selEmpty = document.getElementById("selEmpty");
const selText = document.getElementById("selText");
const keyPrefix = document.getElementById("keyPrefix");
const changeKeyBtn = document.getElementById("changeKeyBtn");
const settingsToggle = document.getElementById("settingsToggle");
const openAppBtn = document.getElementById("openAppBtn");
const actionsGrid = document.getElementById("actionsGrid");


let capturedText = "";
let currentApiKey = null;
let captureMode = "selection"; // "selection" | "page" | "url"
let currentPageUrl = "";
let currentPageTitle = "";
let detectedLanguage = "en"; // Detected from page content

// ─── Language toggle ───
const langToggle = document.getElementById("langToggle");
KLAR_I18N.init().then((lang) => {
  if (langToggle) langToggle.textContent = lang.toUpperCase();
});
langToggle?.addEventListener("click", () => {
  const newLang = KLAR_I18N.toggle();
  langToggle.textContent = newLang.toUpperCase();
});
document.addEventListener("klar-lang-changed", (e) => {
  if (langToggle) langToggle.textContent = e.detail.lang.toUpperCase();
});

// ─── Init: Check for existing key ───
chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (response) => {
  if (response?.apiKey) {
    currentApiKey = response.apiKey;
    showMainScreen();
  } else {
    showSetupScreen();
  }
});

// ─── Capture selected text immediately ───
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url?.startsWith("chrome://") || tab.url?.startsWith("about:")) return;
    currentPageUrl = tab.url || "";
    currentPageTitle = tab.title || "";
    // Detect page language + selection in one call
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        selection: window.getSelection()?.toString() || "",
        lang: document.documentElement.lang || document.documentElement.getAttribute("xml:lang") || "",
      }),
    });
    const pageData = results?.[0]?.result || {};
    capturedText = pageData.selection || "";
    // Detect language from page lang attribute, URL, or content heuristics
    const pageLang = (pageData.lang || "").toLowerCase();
    if (pageLang.startsWith("de")) {
      detectedLanguage = "de";
    } else if (pageLang.startsWith("en")) {
      detectedLanguage = "en";
    } else {
      // Heuristic: check URL for .de domain or /de/ path
      const url = (tab.url || "").toLowerCase();
      if (url.includes(".de/") || url.includes("/de/") || url.includes("lang=de")) {
        detectedLanguage = "de";
      } else {
        // Heuristic: check text for common German words
        const sample = (capturedText || "").slice(0, 500).toLowerCase();
        const deWords = ["und", "der", "die", "das", "ist", "nicht", "ein", "eine", "auch", "sich", "werden", "nach", "für", "über"];
        const deCount = deWords.filter(w => sample.includes(" " + w + " ")).length;
        detectedLanguage = deCount >= 3 ? "de" : "en";
      }
    }
    updateSelectionUI();
  } catch { /* Can't inject into this page */ }
})();

// ─── Capture mode toggles ───
const captureSelBtn = document.getElementById("captureSelection");
const capturePageBtn = document.getElementById("capturePage");
const captureUrlBtn = document.getElementById("captureUrl");
const selLabel = document.getElementById("selLabel");

function setCaptureModeUI(mode) {
  captureMode = mode;
  [captureSelBtn, capturePageBtn, captureUrlBtn].forEach(b => b.classList.remove("active"));
  if (mode === "selection") {
    captureSelBtn.classList.add("active");
    selLabel.textContent = t("selectedText");
  } else if (mode === "page") {
    capturePageBtn.classList.add("active");
    selLabel.textContent = t("fullPageContent");
  } else {
    captureUrlBtn.classList.add("active");
    selLabel.textContent = t("pageUrlLabel");
  }
  updateSelectionUI();
}

captureSelBtn.addEventListener("click", () => setCaptureModeUI("selection"));

capturePageBtn.addEventListener("click", async () => {
  setCaptureModeUI("page");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = ["article", "main", "[role='main']", ".post-content", ".article-body", ".entry-content"];
        for (const s of sel) {
          const el = document.querySelector(s);
          if (el && el.innerText.trim().length > 100) return el.innerText.trim();
        }
        return document.body.innerText.trim();
      },
    });
    capturedText = (results?.[0]?.result || "").slice(0, KLAR.MAX_TEXT_LENGTH);
    updateSelectionUI();
  } catch {
    toast("error", t("cannotCapturePage"));
    setCaptureModeUI("selection");
  }
});

captureUrlBtn.addEventListener("click", () => {
  setCaptureModeUI("url");
  capturedText = currentPageUrl;
  updateSelectionUI();
});

// ─── Screen transitions ───
function showSetupScreen() {
  setupScreen.classList.remove("hidden");
  mainScreen.classList.add("hidden");
  apiKeyInput.focus();
}

function showMainScreen() {
  setupScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  // Show key prefix
  if (currentApiKey) {
    const parts = currentApiKey.split("_");
    keyPrefix.textContent = parts.length >= 2 ? `klar_${parts[1]}` : "klar_****";
  }
  updateSelectionUI();
}

// ─── Selection UI ───
function updateSelectionUI() {
  const isUrlMode = captureMode === "url";
  const hasText = isUrlMode ? currentPageUrl.length > 0 : capturedText.length > 0;
  const isValid = isUrlMode ? currentPageUrl.startsWith("http") : capturedText.length >= KLAR.MIN_TEXT_LENGTH;

  if (hasText) {
    selEmpty.classList.add("hidden");
    selText.classList.remove("hidden");
    selText.textContent = isUrlMode ? currentPageUrl : capturedText;
    selCard.classList.add("has-text");
    selCount.textContent = isUrlMode ? "URL" : `${capturedText.length} chars`;
    selCount.className = "selection-count " + (isValid ? "valid" : "invalid");
  } else {
    selEmpty.classList.remove("hidden");
    selText.classList.add("hidden");
    selCard.classList.remove("has-text");
    selCount.textContent = "";
    selEmpty.textContent = captureMode === "page"
      ? t("capturingPage")
      : captureMode === "url"
        ? t("noPageUrl")
        : t("selectTextHintFull");
  }

  // Enable/disable action buttons
  actionsGrid.querySelectorAll(".action-btn").forEach((btn) => {
    btn.disabled = !isValid;
  });
}

// ─── Toggle password visibility ───
toggleVis.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleVis.textContent = isPassword ? t("hideKey") : t("showKey");
});

// ─── Save & Validate key (server-side) ───
saveKeyBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    toast("error", t("enterApiKey"));
    return;
  }
  if (!key.startsWith("klar_")) {
    toast("error", t("invalidKeyFormat"));
    return;
  }

  // Loading state
  saveKeyBtn.disabled = true;
  saveSpinner.style.display = "inline-block";
  saveBtnText.textContent = t("validatingKey");

  try {
    // Use the lightweight validate endpoint — no pipeline execution needed
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "VALIDATE_KEY", apiKey: key }, resolve);
    });

    if (!result || !result.valid) {
      const msg = result?.message || "Invalid API key";
      toast("error", msg);
      return;
    }

    // Key is valid — save it
    currentApiKey = key;
    chrome.runtime.sendMessage({ type: "SET_API_KEY", apiKey: key }, () => {
      const planLabel = result.plan ? ` (${result.plan} plan)` : "";
      toast("ok", `${t("apiKeyVerified")}${planLabel}`);
      setTimeout(() => showMainScreen(), 600);
    });
  } catch (err) {
    toast("error", err.message || "Something went wrong. Please try again.");
  } finally {
    saveKeyBtn.disabled = false;
    saveSpinner.style.display = "none";
    saveBtnText.textContent = t("verifyAndSaveKey");
  }
});

// ─── Analysis action handler (shared by both grids) ───
async function handleAnalysisClick(e) {
  const btn = e.target.closest(".action-btn");
  if (!btn || btn.disabled) return;

  const analysis = btn.dataset.analysis;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Block restricted pages where content script cannot run
  const url = tab.url || "";
  if (/^(chrome|edge|brave|about|chrome-extension|devtools):/.test(url)) {
    toast("error", t("cannotAnalyzePage"));
    return;
  }

  const analyses = analysis === "comprehensive"
    ? ["fact-check", "bias-check", "ai-detection", "plagiarism"]
    : [analysis];

  // Visual feedback: lock all buttons, show "Analyzing…" on the clicked one
  actionsGrid.querySelectorAll(".action-btn").forEach(b => { b.disabled = true; });
  const nameEl = btn.querySelector(".action-name");
  const originalName = nameEl.textContent;
  nameEl.textContent = t("analyzing");
  btn.style.borderColor = "#059669";

  // Dispatch based on capture mode
  if (captureMode === "url") {
    chrome.runtime.sendMessage({
      type: "VERIFY_URL",
      url: currentPageUrl,
      tabId: tab.id,
      analyses,
      language: detectedLanguage,
    });
  } else {
    chrome.runtime.sendMessage({
      type: "VERIFY_TEXT",
      text: capturedText,
      tabId: tab.id,
      analyses,
      language: detectedLanguage,
    });
  }

  toast("info", "Opening results panel…");
  setTimeout(() => window.close(), 500);
}

actionsGrid.addEventListener("click", handleAnalysisClick);

// ─── Change key button ───
changeKeyBtn.addEventListener("click", () => {
  apiKeyInput.value = currentApiKey || "";
  showSetupScreen();
});

// ─── Settings toggle (same as change key for now) ───
settingsToggle.addEventListener("click", () => {
  if (mainScreen.classList.contains("hidden")) {
    if (currentApiKey) showMainScreen();
  } else {
    apiKeyInput.value = currentApiKey || "";
    showSetupScreen();
  }
});

// ─── Toast notifications ───
let toastTimeout;
function toast(type, message) {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.className = `toast toast-${type} show`;
  toastTimeout = setTimeout(() => { toastEl.classList.remove("show"); }, 3000);
}
