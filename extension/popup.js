/**
 * KLAR Extension — Popup Script
 */

const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const verifyBtn = document.getElementById("verifyBtn");
const statusEl = document.getElementById("status");

// Load saved API key
chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (response) => {
  if (response?.apiKey) {
    apiKeyInput.value = response.apiKey;
    updateStatus(true);
  }
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    updateStatus(false, "Please enter an API key");
    return;
  }

  if (!key.startsWith("klar_")) {
    updateStatus(false, "Invalid key format. Keys start with klar_");
    return;
  }

  chrome.runtime.sendMessage({ type: "SET_API_KEY", apiKey: key }, () => {
    updateStatus(true, "API key saved!");
  });
});

verifyBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Get selected text from active tab
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() || "",
  }, (results) => {
    const selectedText = results?.[0]?.result;
    if (!selectedText || selectedText.length < KLAR.MIN_TEXT_LENGTH) {
      statusEl.textContent = `Select at least ${KLAR.MIN_TEXT_LENGTH} characters on the page first`;
      statusEl.className = "status status-error";
      return;
    }

    chrome.runtime.sendMessage({
      type: "VERIFY_TEXT",
      text: selectedText,
      tabId: tab.id,
    });

    // Close popup — result shows in content script panel
    window.close();
  });
});

function updateStatus(hasKey, message) {
  if (hasKey) {
    statusEl.textContent = message || "API key configured ✓";
    statusEl.className = "status status-ok";
    verifyBtn.disabled = false;
  } else {
    statusEl.textContent = message || "No API key configured";
    statusEl.className = message ? "status status-error" : "status status-none";
    verifyBtn.disabled = true;
  }
}
