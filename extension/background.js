/**
 * KLAR Extension — Background Service Worker
 *
 * Handles context menus, API communication, and extension state.
 */

const API_BASE = "https://klar.tools";

// Context menu for right-click → "Verify with KLAR"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "klar-verify-selection",
    title: "Verify with KLAR",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "klar-verify-page",
    title: "Verify this page with KLAR",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "klar-verify-selection" && info.selectionText) {
    await verifyText(info.selectionText, tab?.id);
  } else if (info.menuItemId === "klar-verify-page" && tab?.url) {
    await verifyUrl(tab.url, tab.id);
  }
});

// Listen for messages from popup/content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "VERIFY_TEXT") {
    verifyText(message.text, message.tabId).then(sendResponse);
    return true; // async response
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
});

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey"], (result) => {
      resolve(result.apiKey || null);
    });
  });
}

async function verifyText(text, tabId) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    notifyTab(tabId, { type: "KLAR_ERROR", error: "No API key configured. Open the extension popup to set up." });
    return { error: "No API key" };
  }

  if (text.length < 50) {
    notifyTab(tabId, { type: "KLAR_ERROR", error: "Text too short. Select at least 50 characters." });
    return { error: "Text too short" };
  }

  notifyTab(tabId, { type: "KLAR_LOADING" });

  try {
    const response = await fetch(`${API_BASE}/api/extension/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text: text.slice(0, 5000), analyses: ["fact-check"] }),
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
  }
}

async function verifyUrl(url, tabId) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    notifyTab(tabId, { type: "KLAR_ERROR", error: "No API key configured." });
    return { error: "No API key" };
  }

  notifyTab(tabId, { type: "KLAR_LOADING" });

  try {
    const response = await fetch(`${API_BASE}/api/extension/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, analyses: ["fact-check"] }),
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
  }
}

function notifyTab(tabId, message) {
  if (tabId) {
    chrome.tabs.sendMessage(tabId, message).catch(() => {
      // Tab may not have content script injected
    });
  }
}
