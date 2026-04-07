/**
 * KLAR Extension — Background Service Worker
 *
 * Handles context menus, API communication, and extension state.
 */

importScripts("constants.js");

// ─── Keep-alive: prevent Chrome from killing the service worker during long API calls ───
let keepAliveInterval = null;
function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    // Simple ping to keep service worker alive (Chrome kills idle workers after 30s)
    chrome.runtime.getPlatformInfo(() => {});
  }, 25000);
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
    verifyUrl(message.url, message.tabId).then(sendResponse);
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

/**
 * Ensure the content script is injected into the target tab.
 * Pings first; if no response, injects programmatically.
 * Waits briefly after injection to let the listener register.
 */
async function ensureContentScript(tabId) {
  if (!tabId) return false;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "KLAR_PING" });
    return true; // already injected
  } catch {
    // Content script missing (tab was open before extension load/reload)
    try {
      await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ["constants.js", "content.js"] });
      // Wait for listener to register before sending messages
      await new Promise((r) => setTimeout(r, 150));
      return true;
    } catch {
      return false; // restricted page (chrome://, about:, etc.)
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
    // Side panel API may not be available or tab is restricted
  }
}

async function verifyText(text, tabId, analyses) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const msg = chrome.i18n.getMessage("noApiKeyError") || "No API key configured. Open the extension popup to set up.";
    notifyTab(tabId, { type: "KLAR_ERROR", error: msg });
    return { error: "No API key" };
  }

  if (text.length < KLAR.MIN_TEXT_LENGTH) {
    const msg = chrome.i18n.getMessage("textTooShortError", [String(KLAR.MIN_TEXT_LENGTH)]) || `Text too short. Select at least ${KLAR.MIN_TEXT_LENGTH} characters.`;
    notifyTab(tabId, { type: "KLAR_ERROR", error: msg });
    return { error: "Text too short" };
  }

  // Open side panel first so user immediately sees loading state
  await openSidePanel(tabId);

  // Ensure content script is available to receive results
  await ensureContentScript(tabId);

  notifyTab(tabId, { type: "KLAR_LOADING" });

  startKeepAlive();
  try {
    const response = await fetch(`${KLAR.API_BASE}/api/extension/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: text.slice(0, KLAR.MAX_TEXT_LENGTH),
        analyses: analyses || ["fact-check"],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    notifyTab(tabId, { type: "KLAR_RESULT", result });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Verification failed";
    notifyTab(tabId, { type: "KLAR_ERROR", error });
    return { error };
  } finally {
    stopKeepAlive();
  }
}

async function verifyUrl(url, tabId, analyses) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const msg = chrome.i18n.getMessage("noApiKeyError") || "No API key configured.";
    notifyTab(tabId, { type: "KLAR_ERROR", error: msg });
    return { error: "No API key" };
  }

  await openSidePanel(tabId);
  await ensureContentScript(tabId);
  notifyTab(tabId, { type: "KLAR_LOADING" });

  startKeepAlive();
  try {
    const response = await fetch(`${KLAR.API_BASE}/api/extension/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, analyses: analyses || ["fact-check"] }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    notifyTab(tabId, { type: "KLAR_RESULT", result });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Verification failed";
    notifyTab(tabId, { type: "KLAR_ERROR", error });
    return { error };
  } finally {
    stopKeepAlive();
  }
}

// ─── Persistent state store — sidepanel can request this even if it opens late ───
let latestState = { type: "KLAR_IDLE" };

function notifyTab(tabId, message) {
  // Always store latest state so sidepanel can retrieve it on open
  latestState = message;

  if (tabId) {
    chrome.tabs.sendMessage(tabId, message).catch(() => {
      // Tab may not have content script injected
    });
  }
  // Also broadcast to side panel (it listens via chrome.runtime.onMessage)
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel may not be open yet — that's ok, it will poll latestState
  });
}
